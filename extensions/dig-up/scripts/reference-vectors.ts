// DigUp's reference-vector check, and a throughput measurement, for the llama-server embedder.
//
//   bash scripts/run-node.sh scripts/reference-vectors.ts [--np N] [--bench] [--keep]
//
// Embeds the nine inputs of DigUp's ReferenceVectorTests (test/fixtures/digup/reference) and prints each one's cosine
// with the stored vector; DigUp's bar is 0.999. --np sets the index server's slots (llama-server -np, -c 2304*N).
// --bench adds texts/s, images/s and audio windows/s on the testbed. Also imported by test/embedder.test.ts.
//
// Images are sized the way the indexer sizes them, by the Swift helper's "size" op (DigUp's ImageSizing), with JPEGs
// decoded by the llama.cpp build's own stb_image (`serve --mtmd`) as DigUp's are. Without a built helper
// (assets/digup-helper) or that build's libmtmd the image cases are skipped.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { EmbedderManager, type Embedder } from "../engine/embedder";
import { mtmdBeside } from "../engine/helper";
import { findLlama, locateModels } from "../engine/install";
import { fileLog } from "../engine/log";
import { makePaths } from "../engine/paths";
import { Prompts } from "../engine/types";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
export const REFERENCE_DIR = join(ROOT, "test/fixtures/digup/reference");
export const VENDORED_LLAMA = join(ROOT, ".vendor/llama-b11624/llama-server");
export const DIGUP_MODELS = join(homedir(), "Library/Application Support/DigUp/Models");
export const HELPER_BIN = join(ROOT, "assets/digup-helper");
export const TESTBED = join(ROOT, ".testbed");
/** DigUp's bar: runtimes that agree measure at least this (ReferenceVectorTests.swift). */
export const AGREEMENT = 0.999;
/** Our servers stay in this range. */
export const PORT_RANGE: [number, number] = [18900, 18999];

// ---------------------------------------------------------------------------------------------------------------------
// The inputs
// ---------------------------------------------------------------------------------------------------------------------

/** The five texts of ReferenceVectorTests, with the app's prompts. */
export function referenceTexts(): Array<{ name: string; text: string }> {
  // Past the sliding attention window (1024), so the global layers count as well: about 1,800 tokens.
  const notes = Array.from({ length: 60 }, (_, i) => {
    const n = i + 1;
    return `Note ${n}: the review moved to room ${(n % 7) + 2} because the projector in the main hall failed again, and the team agreed to send the slides the night before.`;
  }).join(" ");
  return [
    { name: "query", text: Prompts.query("payment declined error") },
    { name: "query-bn", text: Prompts.query("ইলিশ মাছ রান্না") },
    { name: "query-ar", text: Prompts.query("متى تغلق المكتبة") },
    {
      name: "document",
      text: Prompts.document(
        "Tokyo itinerary",
        "Flight to Tokyo Haneda on November 3. Then the train to Kamakura to see the Great Buddha, and back for dinner in Shibuya.",
      ),
    },
    { name: "document-long", text: Prompts.document(null, notes) },
  ];
}

/** (name, file, budget) of the three image inputs. */
export const REFERENCE_IMAGES = [
  { name: "screen-280", file: "screen.png", budget: 280 },
  { name: "photo-140", file: "photo.jpg", budget: 140 },
  { name: "frame-70", file: "photo.jpg", budget: 70 },
] as const;

export function storedVectors(): Record<string, number[]> {
  return (
    JSON.parse(readFileSync(join(REFERENCE_DIR, "vectors.json"), "utf8")) as { vectors: Record<string, number[]> }
  ).vectors;
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.sqrt(na * nb);
}

// ---------------------------------------------------------------------------------------------------------------------
// Image sizing: DigUp's ImageSizing, by the Swift helper
// ---------------------------------------------------------------------------------------------------------------------

/** libmtmd of the vendored llama.cpp: its stb_image is the JPEG decoder DigUp's pictures go through. */
const MTMD_LIBRARY = mtmdBeside(VENDORED_LLAMA);

/** Why images can't be sized here, or null when the helper is built. */
export function helperMissing(): string | null {
  if (!existsSync(HELPER_BIN)) return `no Swift helper at ${HELPER_BIN} (scripts/build-helper.sh builds it)`;
  return MTMD_LIBRARY ? null : `no libmtmd.dylib beside ${VENDORED_LLAMA}`;
}

export interface SizeJob {
  path: string;
  budget: number;
  out: string;
}

/** Writes each job's picture as a PNG sized for its budget, with the helper's "size" op. Returns the sizes, in order. */
export async function sizeImages(jobs: SizeJob[]): Promise<Array<{ width: number; height: number }>> {
  for (const job of jobs) mkdirSync(dirname(job.out), { recursive: true });
  const child = spawn(HELPER_BIN, ["serve", "--mtmd", MTMD_LIBRARY ?? ""], { stdio: ["pipe", "pipe", "pipe"] });
  let log = "";
  child.stderr.on("data", (chunk: Buffer) => (log += chunk.toString("utf8")));
  const exited = new Promise<void>((resolveExit) => child.once("close", () => resolveExit()));
  const replies = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
  const sizes: Array<{ width: number; height: number }> = [];
  try {
    for (const [index, job] of jobs.entries()) {
      child.stdin.write(`${JSON.stringify({ id: index + 1, op: "size", ...job })}\n`);
      const line = await replies.next();
      const reply = JSON.parse(line.value ?? "{}") as {
        ok?: boolean;
        error?: string;
        sized?: { width: number; height: number };
      };
      if (!reply.ok || !reply.sized)
        throw new Error(`helper size ${basename(job.path)}: ${reply.error ?? "no answer"}`);
      sizes.push(reply.sized);
    }
  } finally {
    child.stdin.end(); // the helper exits at the end of its input, and so its log is complete
    const timer = setTimeout(() => child.kill(), 5000);
    await exited;
    clearTimeout(timer);
  }
  // Pixels ImageIO decoded differ a little from DigUp's (frame-70 measured 0.9986): don't let that pass unnoticed.
  const fallback = /[^\n]*ImageIO decodes JPEG instead[^\n]*/.exec(log);
  if (fallback) throw new Error(`the helper did not use llama.cpp's decoder: ${fallback[0].trim()}`);
  return sizes;
}

// ---------------------------------------------------------------------------------------------------------------------
// Running the check
// ---------------------------------------------------------------------------------------------------------------------

export type Setup = { llama: string; textModel: string; mediaModel: string } | { skip: string };

/** The vendored llama.cpp and the DigUp model folder, or why the check cannot run here. */
export function referenceSetup(): Setup {
  const paths = makePaths(join(tmpdir(), "digup-reference-none"), ROOT);
  const llama = findLlama(paths, VENDORED_LLAMA);
  if (llama.bin === null) return { skip: llama.reason };
  const models = locateModels(paths, DIGUP_MODELS);
  if (!models?.media) return { skip: `the model files are not in ${DIGUP_MODELS}` };
  return { llama: llama.bin, textModel: models.text, mediaModel: models.media };
}

export function makeManager(
  setup: Exclude<Setup, { skip: string }>,
  logs: string,
  o: { parallel?: number; queryIdleSeconds?: number; indexLingerSeconds?: number } = {},
): EmbedderManager {
  return new EmbedderManager({
    serverBin: setup.llama,
    textModel: setup.textModel,
    mediaModel: setup.mediaModel,
    logs,
    log: fileLog(join(logs, "embedder.log")),
    indexParallel: o.parallel ?? 1,
    queryIdleSeconds: o.queryIdleSeconds,
    indexLingerSeconds: o.indexLingerSeconds,
    portRange: PORT_RANGE,
  });
}

export interface ReferenceRow {
  name: string;
  cosine: number;
  /** The sized picture, for images. */
  size?: string;
}

/** Embeds the reference inputs and returns each one's cosine with DigUp's stored vector (images only with the helper). */
export async function checkReference(embedder: Embedder, scratch: string): Promise<ReferenceRow[]> {
  const stored = storedVectors();
  const rows: ReferenceRow[] = [];
  const add = (name: string, vector: Float32Array | Error, size?: string) => {
    if (vector instanceof Error) throw vector;
    rows.push({ name, cosine: cosine(vector, stored[name]), ...(size ? { size } : {}) });
  };

  const texts = referenceTexts();
  const vectors = await embedder.embedTexts(texts.map((t) => t.text));
  texts.forEach((t, i) => add(t.name, vectors[i]));

  if (!helperMissing()) {
    const jobs = REFERENCE_IMAGES.map((image) => ({
      path: join(REFERENCE_DIR, image.file),
      budget: image.budget,
      out: join(scratch, `${image.name}.png`),
    }));
    const sizes = await sizeImages(jobs);
    const images = await embedder.embedImages(jobs.map((job) => job.out));
    REFERENCE_IMAGES.forEach((image, i) => add(image.name, images[i], `${sizes[i].width}x${sizes[i].height}`));
  }

  const [speech] = await embedder.embedAudio([join(REFERENCE_DIR, "speech.wav")]);
  add("speech", speech);
  return rows;
}

// ---------------------------------------------------------------------------------------------------------------------
// Throughput
// ---------------------------------------------------------------------------------------------------------------------

function rssMB(pid: number | null): number {
  if (!pid) return 0;
  return Math.round(
    Number(execFileSync("/bin/ps", ["-o", "rss=", "-p", String(pid)], { encoding: "utf8" }).trim()) / 1024,
  );
}

async function timed<T>(work: () => Promise<T>): Promise<{ seconds: number; value: T }> {
  const began = performance.now();
  const value = await work();
  return { seconds: (performance.now() - began) / 1000, value };
}

/**
 * 1800-character chunks (200 overlap) of the testbed's team notes, with the document prompt, as the indexer sends them.
 * Prose, as DigUp embeds it: the testbed's sensor readings are digits, which DigUp keeps for keywords only.
 */
function testbedChunks(count: number): string[] {
  const text = readFileSync(join(TESTBED, "synthetic/long/Team notes 2026.md"), "utf8");
  const chunks: string[] = [];
  for (let at = 0; chunks.length < count && at + 1800 <= text.length; at += 1600) {
    chunks.push(Prompts.document("Team notes 2026", text.slice(at, at + 1800)));
  }
  return chunks;
}

/** Tokens the server makes of `texts` (BOS and EOS included). */
async function countTokens(port: number, texts: string[]): Promise<number> {
  let total = 0;
  for (const content of texts) {
    const response = await fetch(`http://127.0.0.1:${port}/tokenize`, {
      method: "POST",
      body: JSON.stringify({ content, add_special: true, parse_special: true }),
    });
    total += ((await response.json()) as { tokens: number[] }).tokens.length;
  }
  return total;
}

/** The samples of a PCM WAV, wherever its data chunk sits (the testbed's have a LIST chunk first). */
function pcmOf(wav: Buffer): Buffer {
  for (let at = 12; at + 8 <= wav.length;) {
    const size = wav.readUInt32LE(at + 4);
    if (wav.toString("latin1", at, at + 4) === "data") return wav.subarray(at + 8, at + 8 + size);
    at += 8 + size + (size & 1);
  }
  throw new Error("no data chunk");
}

/** A 30 s window (the longest the indexer makes) of a 16 kHz mono PCM16 clip, looped to length, with a 44-byte header. */
function thirtySecondWindow(clip: Buffer): Buffer {
  const samples = pcmOf(clip);
  const pcm = Buffer.alloc(30 * 16_000 * 2);
  for (let at = 0; at < pcm.length; at += samples.length)
    samples.copy(pcm, at, 0, Math.min(samples.length, pcm.length - at));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "latin1");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8, "latin1");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(16_000, 24);
  header.writeUInt32LE(32_000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "latin1");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export interface BenchResult {
  textsPerSecond: number;
  imagesPerSecond: Partial<Record<140 | 280, number>>;
  audioWindowsPerSecond: number;
  rssBefore: number;
  rssAfter: number;
}

export async function bench(manager: EmbedderManager, embedder: Embedder, scratch: string): Promise<BenchResult> {
  const pid = manager.servers().index.pid;
  const result: BenchResult = {
    textsPerSecond: 0,
    imagesPerSecond: {},
    audioWindowsPerSecond: 0,
    rssBefore: rssMB(pid),
    rssAfter: 0,
  };
  console.log(`\nthroughput (index server rss ${result.rssBefore} MB before)`);

  const chunks = testbedChunks(90);
  const tokens = await countTokens(manager.servers().index.port ?? 0, chunks);
  await embedder.embedTexts(chunks.slice(0, 16)); // warm up
  const text = await timed(() => embedder.embedTexts(chunks));
  result.textsPerSecond = chunks.length / text.seconds;
  console.log(
    `  texts: ${result.textsPerSecond.toFixed(1)}/s, ${Math.round(tokens / text.seconds)} tokens/s  ` +
      `(${chunks.length} chunks of 1800 characters, ${Math.round(tokens / chunks.length)} tokens each)`,
  );

  const missing = helperMissing();
  if (missing) {
    console.log(`  images: skipped, ${missing}`);
  } else {
    const pictures = ["img", "screenshots"]
      .flatMap((folder) =>
        readdirSync(join(TESTBED, "synthetic", folder)).map((f) => join(TESTBED, "synthetic", folder, f)),
      )
      .filter((f) => [".jpg", ".png"].includes(extname(f).toLowerCase()));
    for (const budget of [140, 280] as const) {
      const jobs = pictures.map((path, i) => ({ path, budget, out: join(scratch, `bench-${budget}-${i}.png`) }));
      await sizeImages(jobs);
      const paths = jobs.map((j) => j.out);
      await embedder.embedImages(paths.slice(0, 2)); // warm up
      const run = await timed(() => embedder.embedImages(paths));
      const failed = run.value.filter((v) => v instanceof Error);
      if (failed.length > 0) throw new Error(`pictures failed: ${failed[0]}`);
      result.imagesPerSecond[budget] = paths.length / run.seconds;
      console.log(`  images at ${budget}: ${result.imagesPerSecond[budget]!.toFixed(1)}/s  (${paths.length} pictures)`);
    }
  }

  const clips = readdirSync(join(TESTBED, "synthetic/audio"))
    .filter((f) => f.endsWith(".wav"))
    .map((f) => join(TESTBED, "synthetic/audio", f));
  mkdirSync(scratch, { recursive: true });
  const windows = clips.map((clip, i) => {
    const out = join(scratch, `window-${i}.wav`);
    writeFileSync(out, thirtySecondWindow(readFileSync(clip)));
    return out;
  });
  await embedder.embedAudio(windows.slice(0, 1)); // warm up
  const audio = await timed(() => embedder.embedAudio(windows));
  const failed = audio.value.filter((v) => v instanceof Error);
  if (failed.length > 0) throw new Error(`audio windows failed: ${failed[0]}`);
  result.audioWindowsPerSecond = windows.length / audio.seconds;
  console.log(`  audio windows (30 s): ${result.audioWindowsPerSecond.toFixed(2)}/s  (${windows.length} windows)`);
  result.rssAfter = rssMB(pid);
  console.log(`  index server rss ${result.rssAfter} MB after`);
  return result;
}

// ---------------------------------------------------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const parallel = args.includes("--np") ? Number(args[args.indexOf("--np") + 1]) : 1;
  const setup = referenceSetup();
  if ("skip" in setup) {
    console.log(`skipped: ${setup.skip}`);
    return;
  }
  const scratch = mkdtempSync(join(tmpdir(), "digup-reference-"));
  const manager = makeManager(setup, join(scratch, "logs"), { parallel });
  try {
    const began = performance.now();
    const embedder = await manager.index();
    console.log(
      `index server ready in ${((performance.now() - began) / 1000).toFixed(1)} s  (-np ${parallel}, -c ${2304 * parallel})`,
    );
    const rows = await checkReference(embedder, join(scratch, "images"));
    for (const row of rows) {
      const note = row.size ? `  [${row.size}]` : "";
      console.log(
        `  ${row.name.padEnd(14)} cosine ${row.cosine.toFixed(6)}  ${row.cosine >= AGREEMENT ? "ok" : "BELOW 0.999"}${note}`,
      );
    }
    const missing = helperMissing();
    if (missing) console.log(`  image cases skipped: ${missing}`);
    const worst = Math.min(...rows.map((r) => r.cosine));
    console.log(`\nworst cosine ${worst.toFixed(6)}`);
    process.exitCode = worst >= AGREEMENT ? 0 : 1;
    if (args.includes("--bench")) await bench(manager, embedder, join(scratch, "bench"));
  } finally {
    await manager.stop();
    if (args.includes("--keep")) console.log(`kept ${scratch}`);
    else rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
