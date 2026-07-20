/**
 * Smoke test harness: exercises convertMedia + mergeMedia end-to-end against
 * auto-generated tiny fixtures so we know the wiring actually works.
 *
 * We intentionally don't ship real binary fixtures — FFmpeg is perfectly
 * capable of generating tiny test inputs from its built-in sources
 * (`testsrc`, `sine`, `color` filters).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { convertMedia } from "../../src/utils/converter";
import { mergeMedia } from "../../src/utils/merge";
import type { QualitySettings } from "../../src/types/media";

// `QualitySettings` is derived from `VIDEO_QUALITY_OBJECT as const`, so it
// narrows fields like `crf` to a single literal value (e.g. `75`) and
// requires every format key to be present. At runtime only the one matching
// key is read, but TypeScript has no way to know that here — we use a
// helper cast so each smoke check reads clearly.
function q(partial: Record<string, unknown>): QualitySettings {
  return partial as unknown as QualitySettings;
}

const execP = promisify(exec);

const TMP = path.join(os.tmpdir(), `media-converter-smoke-${Date.now()}`);
fs.mkdirSync(TMP, { recursive: true });

type Check = { name: string; ok: boolean; info?: string };
const results: Check[] = [];

function log(step: string) {
  process.stdout.write(`\x1b[36m→ ${step}\x1b[0m\n`);
}

function pass(name: string, info?: string) {
  results.push({ name, ok: true, info });
  process.stdout.write(`  \x1b[32m✓ ${name}${info ? ` (${info})` : ""}\x1b[0m\n`);
}

function fail(name: string, info: string) {
  results.push({ name, ok: false, info });
  process.stdout.write(`  \x1b[31m✗ ${name} — ${info}\x1b[0m\n`);
}

async function findFFmpegBinary(): Promise<string> {
  const candidates = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  try {
    const { stdout } = await execP("which ffmpeg");
    const p = stdout.trim();
    if (p && fs.existsSync(p)) return p;
  } catch {
    /* ignore */
  }
  throw new Error("FFmpeg not found on PATH — install it before running smoke tests.");
}

async function genVideoFixture(ffmpeg: string, out: string, durationSec = 2): Promise<void> {
  // 160x120 test pattern + 440Hz sine at 30fps — tiny but valid mp4.
  const cmd =
    `"${ffmpeg}" -y -hide_banner -loglevel error ` +
    `-f lavfi -i testsrc=duration=${durationSec}:size=160x120:rate=30 ` +
    `-f lavfi -i sine=frequency=440:duration=${durationSec} ` +
    `-c:v libx264 -preset ultrafast -pix_fmt yuv420p -tune stillimage ` +
    `-c:a aac -shortest "${out}"`;
  await execP(cmd);
}

async function genAudioFixture(ffmpeg: string, out: string, durationSec = 2): Promise<void> {
  const cmd = `"${ffmpeg}" -y -hide_banner -loglevel error -f lavfi -i sine=frequency=440:duration=${durationSec} "${out}"`;
  await execP(cmd);
}

async function genImageFixture(ffmpeg: string, out: string): Promise<void> {
  const cmd = `"${ffmpeg}" -y -hide_banner -loglevel error -f lavfi -i color=red:size=160x120 -frames:v 1 "${out}"`;
  await execP(cmd);
}

function sizeOf(p: string): number {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

async function probeDuration(ffmpeg: string, p: string): Promise<number | null> {
  try {
    await execP(`"${ffmpeg}" -hide_banner -i "${p}"`);
  } catch (err: unknown) {
    const stderr =
      typeof err === "object" && err !== null && "stderr" in err ? String((err as { stderr: unknown }).stderr) : "";
    const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return null;
}

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  log(`Using workspace: ${TMP}`);
  const ffmpeg = await findFFmpegBinary();
  log(`Using ffmpeg: ${ffmpeg}`);

  // ---- Generate fixtures ----
  log("Generating fixtures");
  const vid1 = path.join(TMP, "a.mp4");
  const vid2 = path.join(TMP, "b.mp4");
  const aud1 = path.join(TMP, "a.wav");
  const aud2 = path.join(TMP, "b.wav");
  const img1 = path.join(TMP, "a.png");
  await genVideoFixture(ffmpeg, vid1, 2);
  await genVideoFixture(ffmpeg, vid2, 2);
  await genAudioFixture(ffmpeg, aud1, 2);
  await genAudioFixture(ffmpeg, aud2, 2);
  await genImageFixture(ffmpeg, img1);
  pass("fixtures generated", `${fs.readdirSync(TMP).length} files`);

  // ---- Video: mp4 -> webm ----
  await check("convert mp4 -> webm", async () => {
    const out = await convertMedia(vid1, ".webm", q({ ".webm": { encodingMode: "crf", crf: 50, quality: "good" } }), {
      outputDir: TMP,
    });
    if (!fs.existsSync(out) || sizeOf(out) < 500) throw new Error(`output missing or too small: ${out}`);
    pass("convert mp4 -> webm", `${sizeOf(out)} bytes`);
  });

  // ---- Video: mp4 -> gif (palette pipeline) ----
  await check("convert mp4 -> gif", async () => {
    const out = await convertMedia(vid1, ".gif", q({ ".gif": { fps: "10", width: "original", loop: true } }), {
      outputDir: TMP,
    });
    if (!fs.existsSync(out) || sizeOf(out) < 500) throw new Error(`output missing or too small: ${out}`);
    pass("convert mp4 -> gif", `${sizeOf(out)} bytes`);
  });

  // ---- Video with trim ----
  await check("convert mp4 with trim 0:00..0:01", async () => {
    const out = await convertMedia(vid1, ".mp4", q({ ".mp4": { encodingMode: "crf", crf: 28, preset: "ultrafast" } }), {
      outputDir: TMP,
      trim: { start: "0", end: "1" },
    });
    const dur = await probeDuration(ffmpeg, out);
    if (dur === null) throw new Error("could not probe trimmed duration");
    if (dur > 1.5) throw new Error(`expected duration <=1.5s, got ${dur}`);
    pass("convert mp4 with trim 0:00..0:01", `duration=${dur.toFixed(2)}s`);
  });

  // ---- Video strip metadata ----
  await check("convert mp4 with stripMetadata", async () => {
    const out = await convertMedia(vid1, ".mp4", q({ ".mp4": { encodingMode: "crf", crf: 28, preset: "ultrafast" } }), {
      outputDir: TMP,
      stripMetadata: true,
    });
    const { stdout } = await execP(`"${ffmpeg}" -hide_banner -i "${out}" -f ffmetadata - 2>&1 || true`);
    if (/title=|artist=|comment=/i.test(stdout)) throw new Error(`metadata not stripped: ${stdout.slice(0, 200)}`);
    pass("convert mp4 with stripMetadata");
  });

  // ---- Audio: wav -> mp3 ----
  await check("convert wav -> mp3", async () => {
    const out = await convertMedia(aud1, ".mp3", q({ ".mp3": { bitrate: "128", vbr: false } }), { outputDir: TMP });
    if (!fs.existsSync(out) || sizeOf(out) < 500) throw new Error(`output missing or too small: ${out}`);
    pass("convert wav -> mp3", `${sizeOf(out)} bytes`);
  });

  // ---- Image: png -> jpg ----
  await check("convert png -> jpg", async () => {
    const out = await convertMedia(img1, ".jpg", q({ ".jpg": 80 }), { outputDir: TMP });
    if (!fs.existsSync(out) || sizeOf(out) < 200) throw new Error(`output missing or too small: ${out}`);
    pass("convert png -> jpg", `${sizeOf(out)} bytes`);
  });

  // ---- Merge: 2 compatible mp4s (should stream-copy) ----
  await check("merge 2 compatible mp4s (stream-copy)", async () => {
    const result = await mergeMedia([vid1, vid2], ".mp4", { outputDir: TMP, outputFileName: "merged-sc" });
    if (!fs.existsSync(result.outputPath)) throw new Error(`merged file missing: ${result.outputPath}`);
    const dur = await probeDuration(ffmpeg, result.outputPath);
    if (dur === null || dur < 3.5) throw new Error(`merged duration looks wrong: ${dur}`);
    if (result.strategy !== "stream-copy") throw new Error(`expected stream-copy, got ${result.strategy}`);
    pass("merge 2 compatible mp4s", `strategy=${result.strategy}, dur=${dur.toFixed(2)}s`);
  });

  // ---- Merge: 2 mp4s forced re-encode ----
  await check("merge 2 mp4s with forceReencode", async () => {
    const result = await mergeMedia([vid1, vid2], ".mp4", {
      outputDir: TMP,
      outputFileName: "merged-re",
      forceReencode: true,
    });
    if (result.strategy !== "reencode") throw new Error(`expected reencode, got ${result.strategy}`);
    const dur = await probeDuration(ffmpeg, result.outputPath);
    if (dur === null || dur < 3.5) throw new Error(`merged (re-encode) duration looks wrong: ${dur}`);
    pass("merge 2 mp4s with forceReencode", `dur=${dur.toFixed(2)}s`);
  });

  // ---- Merge: 2 audio files ----
  await check("merge 2 wav -> mp3 (re-encode)", async () => {
    const result = await mergeMedia([aud1, aud2], ".mp3", { outputDir: TMP, outputFileName: "merged-audio" });
    if (!fs.existsSync(result.outputPath)) throw new Error(`merged audio missing: ${result.outputPath}`);
    const dur = await probeDuration(ffmpeg, result.outputPath);
    if (dur === null || dur < 3.5) throw new Error(`merged audio duration looks wrong: ${dur}`);
    pass("merge 2 wav -> mp3", `strategy=${result.strategy}, dur=${dur.toFixed(2)}s`);
  });

  // ---- Progress callback fires at least once for a video conversion ----
  await check("convert mp4 emits progress events", async () => {
    let gotProgress = false;
    await convertMedia(vid1, ".mkv", q({ ".mkv": { encodingMode: "crf", crf: 35, preset: "ultrafast" } }), {
      outputDir: TMP,
      onProgress: () => {
        gotProgress = true;
      },
    });
    if (!gotProgress) throw new Error("no progress events were emitted");
    pass("convert mp4 emits progress events");
  });

  // ---- Summary ----
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  process.stdout.write(`\n\x1b[1mSmoke results:\x1b[0m ${passed} passed, ${failed} failed\n`);
  process.stdout.write(`Workspace: ${TMP}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Smoke script crashed:", err);
  process.exit(2);
});
