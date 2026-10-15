// EmbeddingGemma 2 through llama.cpp's llama-server (DigUp: LlamaEmbedder.swift runs the same model in process).
//
// Two server profiles, started on demand and stopped when idle:
//   query  text model only, 512-token inputs        (DigUp: LlamaEmbedder(textOnly: true))
//   index  text + mmproj, 2048-token texts          (DigUp: LlamaEmbedder(textOnly: false))
// Queries always go to the query server, also while the index server runs: DigUp keeps its query encoder apart from
// the indexer, and on a busy index server a query waited about 1.1 s behind a batch (19 ms on its own server).
// Requests are plain HTTP on 127.0.0.1. Vectors come back L2-normalized by the server and are normalized again in
// float64, as DigUp does, so a stored vector is exactly unit length.
//
// Long texts: llama-server refuses an input longer than its micro-batch ("too large to process"); it never cuts one.
// DigUp keeps `<bos>`, the first maxTokens-2 tokens and `<eos>`. So a text that may be too long is tokenized with the
// server's /tokenize (the same add_special + parse_special tokenizer the embedding uses) and sent as those token ids,
// cut DigUp's way. Measured on b11624: ids and text give the same vector (cosine 1.0000000) and the same token count,
// and a cut input equals its detokenized prefix sent as text.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import net, { type AddressInfo } from "node:net";
import { join } from "node:path";
import type { Log } from "./log";
import { DIMENSION } from "./types";

export interface Embedder {
  embedTexts(texts: string[]): Promise<Float32Array[]>;
  embedImages(pngPaths: string[]): Promise<Array<Float32Array | Error>>;
  embedAudio(wavPaths: string[]): Promise<Array<Float32Array | Error>>;
}

export type EmbedderState = "off" | "starting" | "ready" | "failed";

export interface EmbedderManagerOptions {
  serverBin: string;
  textModel: string;
  mediaModel: string;
  logs: string;
  log: Log;
  /** The query server stops after this long without a request (default 600, DigUp's encoderIdleSeconds). */
  queryIdleSeconds?: number;
  /** The index server stops this long after doneIndexing() (default 60, DigUp's linger). */
  indexLingerSeconds?: number;
  /** Slots of the index server, a power of two (llama.cpp issue 18532). Default 1: see docs/DESIGN.md. */
  indexParallel?: number;
  /** Ports to pick from (inclusive) instead of an OS-assigned one. */
  portRange?: [number, number];
  /** Seconds to wait for /health after starting (default 120). */
  startTimeoutSeconds?: number;
  /** Milliseconds one request may take before the server counts as hung and is restarted (default 300000). */
  requestTimeoutMs?: number;
}

export interface ServerInfo {
  state: EmbedderState;
  pid: number | null;
  port: number | null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Constants (DigUp: LlamaEmbedder.swift)
// ---------------------------------------------------------------------------------------------------------------------

/** Texts per request: DigUp's `maxSequences`. */
const TEXT_BATCH = 16;
/** Longest input in tokens: the query encoder cuts at 512, the indexer at 2048 (the reference's cut). */
const QUERY_TOKENS = 512;
const INDEX_TOKENS = 2048;
/** "The model silently ignores audio past 30 s of one input" (DigUp: MediaExtractors.swift). */
const AUDIO_SECONDS = 30;
/** Pre-sized images are at most 1120 soft tokens (DigUp's largest budget); mtmd must not rescale them. */
const IMAGE_MAX_TOKENS = 1120;
/**
 * The index server's batch: the server caps image tokens at half of it (1024 at 2048, which would shrink a 1120-token
 * image), so 2304 = 2 x 1152. Texts are still cut at 2048 (research 05, section 3.4).
 */
const INDEX_BATCH = 2304;
/**
 * Media requests in flight at once (at least one per slot). The server decodes a file and makes its patches or mel
 * spectrogram before the slot runs it, so a second request overlaps that with the encoding of the first. Measured on the
 * testbed with -np 1: images at 140 tokens +9-22%, 30 s audio windows about +10%, vectors unchanged (cosine 1.0000000).
 */
const MEDIA_IN_FLIGHT = 2;
const FAILED_RETRY_MS = 15_000;

export interface Profile {
  name: "query" | "index";
  media: boolean;
  /** The server's batch, micro-batch and context of one slot: one input must fit one micro-batch. */
  batch: number;
  slots: number;
}

/** The llama-server command line of a profile. */
export function serverArgs(profile: Profile, files: { textModel: string; mediaModel: string }, port: number): string[] {
  const args = ["-m", files.textModel];
  if (profile.media) {
    // The client sizes every image (DigUp: ImageSizing); with min 1 the server leaves the pixels alone.
    args.push("--mmproj", files.mediaModel, "--image-min-tokens", "1", "--image-max-tokens", String(IMAGE_MAX_TOKENS));
  }
  args.push(
    "--embeddings",
    "--pooling",
    "mean",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    // One input must fit one micro-batch; every slot needs the full input length of context.
    "-c",
    String(profile.batch * profile.slots),
    "-b",
    String(profile.batch),
    "-ub",
    String(profile.batch),
    "-np",
    String(profile.slots),
    // Every build that can load the model (>= b11452) has this flag; b11461 and b11624 checked.
    "--no-webui",
  );
  return args;
}

// ---------------------------------------------------------------------------------------------------------------------
// Vectors
// ---------------------------------------------------------------------------------------------------------------------

/** The server answered, but not with a usable vector. */
class VectorError extends Error {}

/** A server answer as a unit vector: float64 sums, zero stays zero (DigUp: LlamaEmbedder.run). */
export function unitVector(raw: unknown): Float32Array {
  if (!Array.isArray(raw) || raw.length !== DIMENSION) {
    throw new VectorError(`expected a ${DIMENSION}-number vector, got ${Array.isArray(raw) ? raw.length : typeof raw}`);
  }
  let sum = 0;
  for (const value of raw as number[]) sum += value * value;
  if (!Number.isFinite(sum)) throw new VectorError("the model returned a vector with NaN or infinity");
  const scale = sum > 0 ? 1 / Math.sqrt(sum) : 0;
  const vector = new Float32Array(DIMENSION);
  for (let i = 0; i < DIMENSION; i++) vector[i] = (raw as number[])[i] * scale;
  return vector;
}

/** `data` of a /v1/embeddings answer, as vectors in input order. */
function vectorsOf(answer: unknown, count: number): Float32Array[] {
  const data = (answer as { data?: Array<{ index: number; embedding: unknown }> }).data;
  if (!Array.isArray(data) || data.length !== count) {
    throw new VectorError(`expected ${count} embeddings, got ${Array.isArray(data) ? data.length : typeof data}`);
  }
  const sorted = [...data].sort((a, b) => a.index - b.index);
  return sorted.map((item) => unitVector(item.embedding));
}

/**
 * The WAV cut to its first `seconds`, header fixed. The server splits longer audio into 30 s pieces and averages them;
 * DigUp keeps the first 30 s only. Anything that is not a plain WAV goes through unchanged.
 */
export function cutWav(wav: Buffer, seconds: number): Buffer {
  if (wav.length < 12 || wav.toString("latin1", 0, 4) !== "RIFF" || wav.toString("latin1", 8, 12) !== "WAVE")
    return wav;
  let byteRate = 0;
  let blockAlign = 0;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const id = wav.toString("latin1", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === "fmt " && offset + 8 + 16 <= wav.length) {
      byteRate = wav.readUInt32LE(offset + 16);
      blockAlign = wav.readUInt16LE(offset + 20);
    } else if (id === "data") {
      const start = offset + 8;
      // A streamed WAV says 0 or 0xFFFFFFFF: the data runs to the end of the file.
      const length = size === 0 || size === 0xffffffff ? wav.length - start : Math.min(size, wav.length - start);
      const limit =
        byteRate > 0 && blockAlign > 0 ? Math.floor((seconds * byteRate) / blockAlign) * blockAlign : length;
      if (length <= limit) return wav;
      const cut = Buffer.concat([wav.subarray(0, start), wav.subarray(start, start + limit)]);
      cut.writeUInt32LE(cut.length - 8, 4);
      cut.writeUInt32LE(limit, offset + 4);
      return cut;
    }
    offset += 8 + size + (size & 1);
  }
  return wav;
}

// ---------------------------------------------------------------------------------------------------------------------
// One llama-server process
// ---------------------------------------------------------------------------------------------------------------------

/** The server answered, with an error: a problem with this input, not with the server. */
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Context {
  serverBin: string;
  textModel: string;
  mediaModel: string;
  logs: string;
  log: Log;
  portRange?: [number, number];
  startTimeoutMs: number;
  requestTimeoutMs: number;
}

/** Children to kill if this process exits without calling stop(). */
const liveChildren = new Set<ChildProcess>();
let exitHookInstalled = false;
function trackChild(child: ChildProcess): void {
  liveChildren.add(child);
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  process.once("exit", () => {
    for (const live of liveChildren) live.kill("SIGKILL");
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function freePort(range?: [number, number]): Promise<number> {
  const tryPort = (port: number) =>
    new Promise<number | null>((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(null));
      probe.listen(port, "127.0.0.1", () => {
        const { port: bound } = probe.address() as AddressInfo;
        probe.close(() => resolve(bound));
      });
    });
  if (!range) {
    const port = await tryPort(0);
    if (port) return port;
    throw new Error("no free port on 127.0.0.1");
  }
  const [low, high] = range;
  const span = high - low + 1;
  const first = Math.floor(Math.random() * span);
  for (let i = 0; i < span; i++) {
    const port = await tryPort(low + ((first + i) % span));
    if (port) return port;
  }
  throw new Error(`no free port in ${low}-${high}`);
}

/** What the log got since byte `offset`. */
function logSince(file: string, offset: number): string {
  try {
    return readFileSync(file).subarray(offset).toString("utf8");
  } catch {
    return "";
  }
}

/** The last lines of the log written since byte `offset`, for an error message. */
function logTail(file: string, offset: number): string {
  return logSince(file, offset).trim().split("\n").slice(-12).join("\n");
}

/** The server logs every request (about 150 bytes an input): keep one older log beside the current one. */
const LOG_ROTATE_BYTES = 16 << 20;
function rotateLog(file: string): void {
  try {
    if (statSync(file).size > LOG_ROTATE_BYTES) renameSync(file, `${file}.1`);
  } catch {
    // no log yet
  }
}

class Server {
  state: EmbedderState = "off";
  child: ChildProcess | null = null;
  port: number | null = null;
  inflight = 0;

  private starting: Promise<void> | null = null;
  private failure: { error: Error; at: number } | null = null;
  private crashes = 0;
  private timer: NodeJS.Timeout | null = null;
  private stopped = new WeakSet<ChildProcess>();
  private exit: Promise<string> = Promise.resolve("");
  private reaped = false;
  /** Bumped by stop(), so a start that has not spawned yet knows it was cancelled. */
  private generation = 0;

  constructor(
    readonly profile: Profile,
    private readonly ctx: Context,
  ) {}

  private get logFile() {
    return join(this.ctx.logs, `llama-${this.profile.name}.log`);
  }
  private get pidFile() {
    return join(this.ctx.logs, `llama-${this.profile.name}.pid`);
  }
  private get label() {
    return `llama-server (${this.profile.name})`;
  }

  info(): ServerInfo {
    return { state: this.state, pid: this.child?.pid ?? null, port: this.child ? this.port : null };
  }

  /** Resolves when the server answers /health. Starts it if it is off. */
  ensure(): Promise<void> {
    if (this.state === "ready") return Promise.resolve();
    if (this.starting) return this.starting;
    if (this.state === "failed" && this.failure && Date.now() - this.failure.at < FAILED_RETRY_MS) {
      return Promise.reject(this.failure.error);
    }
    const starting = this.start().finally(() => {
      if (this.starting === starting) this.starting = null;
    });
    this.starting = starting;
    return starting;
  }

  private fail(error: Error): void {
    this.state = "failed";
    this.failure = { error, at: Date.now() };
  }

  private async start(): Promise<void> {
    const { ctx, profile } = this;
    this.state = "starting";
    this.failure = null;
    const generation = this.generation;
    let child: ChildProcess | null = null;
    let offset = 0;
    try {
      mkdirSync(ctx.logs, { recursive: true });
      this.reapStale();
      this.port = await freePort(ctx.portRange);
      if (generation !== this.generation) throw new Error("stopped");
      const args = serverArgs(profile, ctx, this.port);
      rotateLog(this.logFile);
      try {
        offset = statSync(this.logFile).size;
      } catch {
        // first start
      }
      const fd = openSync(this.logFile, "a"); // a file, never a pipe: a pipe to a dead parent would block the child
      try {
        writeSync(fd, `--- ${new Date().toISOString()} ${ctx.serverBin} ${args.join(" ")}\n`);
        child = spawn(ctx.serverBin, args, { stdio: ["ignore", fd, fd] });
      } finally {
        closeSync(fd);
      }
      const started = child;
      this.child = started;
      trackChild(started);
      if (started.pid) writeFileSync(this.pidFile, String(started.pid));
      this.exit = new Promise<string>((resolve) => {
        started.once("error", (error) => resolve(`could not start: ${error.message}`));
        started.once("exit", (code, signal) => {
          const how = signal ? `was killed by ${signal}` : `exited with code ${code}`;
          this.onExit(started, how);
          resolve(how);
        });
      });
      ctx.log.info(`${this.label}: starting on port ${this.port} (pid ${started.pid})`);
      const began = Date.now();
      await this.waitReady();
      this.state = "ready";
      ctx.log.info(`${this.label}: ready in ${((Date.now() - began) / 1000).toFixed(1)} s`);
      // The server shrinks larger images to fit its batch without a word to the client; its log says so.
      const capped = /cap image_max_tokens[^\n]*/.exec(logSince(this.logFile, offset));
      if (capped) ctx.log.warn(`${this.label}: ${capped[0].trim()}: large images will not match DigUp's vectors`);
    } catch (error) {
      const stopped = generation !== this.generation || (child !== null && this.stopped.has(child));
      if (child && !stopped && child.pid !== undefined) await this.kill(child);
      if (this.child === child) this.child = null;
      if (stopped) {
        this.state = "off";
        throw new Error(`${this.label} was stopped while starting`);
      }
      const tail = logTail(this.logFile, offset);
      const failure = new Error(`${(error as Error).message}${tail ? `\n${tail}` : ""}`);
      this.fail(failure);
      ctx.log.error(`${this.label}: ${failure.message}`);
      throw failure;
    }
  }

  private async waitReady(): Promise<void> {
    const deadline = Date.now() + this.ctx.startTimeoutMs;
    let gone: string | null = null;
    void this.exit.then((how) => (gone = how));
    while (gone === null) {
      if (Date.now() > deadline) {
        throw new Error(`${this.label} did not become ready in ${Math.round(this.ctx.startTimeoutMs / 1000)} s`);
      }
      try {
        const response = await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(1000) });
        await response.body?.cancel();
        if (response.status === 200) return;
      } catch {
        // not listening yet
      }
      await sleep(100);
    }
    throw new Error(`${this.label} ${gone}`);
  }

  private onExit(child: ChildProcess, how: string): void {
    liveChildren.delete(child);
    if (this.child !== child) return;
    this.child = null;
    rmSync(this.pidFile, { force: true });
    if (this.stopped.has(child)) {
      this.state = "off";
      return;
    }
    if (this.state === "starting") return; // start() reports it
    this.ctx.log.error(`${this.label} ${how}`);
    // One crash is restarted by the next request; a second with no answered request in between is final.
    this.crashes++;
    if (this.crashes > 1) this.fail(new Error(`${this.label} crashed twice (${how})`));
    else this.state = "off";
  }

  /** A server left over from a daemon that was killed outright would hold a port and a gigabyte. */
  reapStale(): void {
    if (this.reaped) return;
    this.reaped = true;
    try {
      const pid = Number(readFileSync(this.pidFile, "utf8"));
      if (!Number.isInteger(pid) || pid <= 1) return;
      const command = spawnSync("/bin/ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).stdout;
      if (command.includes(this.ctx.serverBin)) {
        process.kill(pid, "SIGKILL");
        this.ctx.log.warn(`${this.label}: stopped a leftover server (pid ${pid})`);
      }
    } catch {
      // no pid file, or the process is gone
    } finally {
      rmSync(this.pidFile, { force: true });
    }
  }

  private async kill(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    child.kill("SIGTERM");
    await Promise.race([exited, sleep(5000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await Promise.race([exited, sleep(2000)]);
    }
  }

  async stop(): Promise<void> {
    this.cancelTimer();
    this.generation++;
    const child = this.child;
    if (!child) {
      if (this.state !== "starting") this.state = "off";
      this.failure = null;
      this.crashes = 0;
      return;
    }
    this.stopped.add(child);
    this.ctx.log.info(`${this.label}: stopping`);
    await this.kill(child);
    this.child = null;
    liveChildren.delete(child);
    rmSync(this.pidFile, { force: true });
    this.state = "off";
    this.crashes = 0;
  }

  // Timers -----------------------------------------------------------------------------------------------------------

  /** Stop after `seconds` without a request (or at once if nothing is running by then). */
  arm(seconds: number): void {
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.inflight > 0) this.arm(seconds);
      else void this.stop();
    }, seconds * 1000);
    this.timer.unref();
  }

  cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  // Requests ---------------------------------------------------------------------------------------------------------

  /**
   * POST JSON to the server and return its JSON. A server that dies mid-request is restarted once and the request is
   * sent again; a server that answers with an error status throws HttpError.
   */
  async request(path: string, body: unknown, o: { idleSeconds?: number } = {}): Promise<unknown> {
    this.inflight++; // before any await, so an idle timer cannot stop the server under a request being sent
    // With a request in flight only stop() moves this on, and a server stopped on purpose must not start again.
    const generation = this.generation;
    try {
      const payload = JSON.stringify(body);
      for (let attempt = 0; ; attempt++) {
        if (generation !== this.generation) throw new Error(`${this.label} was stopped`);
        await this.ensure();
        const child = this.child;
        try {
          const answer = await this.post(path, payload);
          this.crashes = 0;
          if (o.idleSeconds !== undefined) this.arm(o.idleSeconds);
          return answer;
        } catch (error) {
          if (error instanceof HttpError) throw error;
          // The connection broke: give a dying process a moment to report its exit, then try once more.
          if (child && child.exitCode === null && child.signalCode === null) {
            const hung = (error as Error).name === "TimeoutError";
            if (hung) await this.kill(child);
            else await Promise.race([this.exit, sleep(2000)]);
          }
          if (attempt >= 1 || this.state === "failed")
            throw new Error(`${this.label} did not answer: ${(error as Error).message}`);
          this.ctx.log.warn(`${this.label}: ${(error as Error).message}; trying again`);
        }
      }
    } finally {
      this.inflight--;
    }
  }

  private async post(path: string, payload: string): Promise<unknown> {
    const response = await fetch(`http://127.0.0.1:${this.port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(this.ctx.requestTimeoutMs),
    });
    const text = await response.text();
    if (!response.ok) {
      let message = text.slice(0, 300);
      try {
        message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? message;
      } catch {
        // not JSON
      }
      throw new HttpError(response.status, message);
    }
    return JSON.parse(text);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// What callers hold
// ---------------------------------------------------------------------------------------------------------------------

async function mapLimit<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
}

/** A UTF-16 surrogate without its other half (a well-formed pair is one code point, not Cs). */
const LONE_SURROGATE = /\p{Cs}/gu;

class Handle implements Embedder {
  constructor(
    private readonly manager: EmbedderManager,
    private readonly role: "query" | "index",
    /** The manager's generation when this was handed out: after its stop() this handle refuses work. */
    private readonly generation: number,
  ) {}

  private get maxTokens() {
    return this.role === "query" ? QUERY_TOKENS : INDEX_TOKENS;
  }

  /** One request on this handle's server. */
  private call(path: string, body: unknown): Promise<unknown> {
    return this.manager.send(this.role, this.generation, path, body);
  }

  /**
   * The input as the model reads it: `<bos> text <eos>`, and when that is longer than `maxTokens`, DigUp's cut: the
   * first maxTokens-1 tokens and the EOS. The cut needs the server's tokenizer, so unless `always`, it asks only when
   * the text could be long: the tokenizer makes at most one token per UTF-8 byte (unknown bytes have their own tokens,
   * merges only shorten), plus BOS and EOS.
   */
  private async fit(text: string, always = false): Promise<string | number[]> {
    // The server refuses a whole request over one lone surrogate. A Swift string can't hold one, so DigUp never sees
    // it; U+FFFD is what Swift makes of one (String.toWellFormed, which ES2023 typings lack).
    text = text.replace(LONE_SURROGATE, "\uFFFD");
    if (!always && Buffer.byteLength(text) + 2 <= this.maxTokens) return text;
    const answer = (await this.call("/tokenize", { content: text, add_special: true, parse_special: true })) as {
      tokens: number[];
    };
    const tokens = answer.tokens;
    if (tokens.length <= this.maxTokens) return text;
    return [...tokens.slice(0, this.maxTokens - 1), tokens[tokens.length - 1]];
  }

  async embedTexts(texts: string[]): Promise<Float32Array[]> {
    const vectors: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += TEXT_BATCH) {
      const batch = texts.slice(i, i + TEXT_BATCH);
      let input = await Promise.all(batch.map((text) => this.fit(text)));
      let answer: unknown;
      try {
        answer = await this.call("/v1/embeddings", { input, encoding_format: "float" });
      } catch (error) {
        // Should a text ever break the byte bound, the server refuses it: then every input is measured in tokens.
        if (!(error instanceof HttpError && TOO_LONG.test(error.message))) throw error;
        input = await Promise.all(batch.map((text) => this.fit(text, true)));
        answer = await this.call("/v1/embeddings", { input, encoding_format: "float" });
      }
      vectors.push(...vectorsOf(answer, input.length));
    }
    return vectors;
  }

  embedImages(pngPaths: string[]): Promise<Array<Float32Array | Error>> {
    return this.embedMedia(pngPaths, false, (bytes) => ({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${bytes.toString("base64")}` },
    }));
  }

  embedAudio(wavPaths: string[]): Promise<Array<Float32Array | Error>> {
    return this.embedMedia(wavPaths, true, (bytes) => ({
      type: "input_audio",
      input_audio: { data: cutWav(bytes, AUDIO_SECONDS).toString("base64"), format: "wav" },
    }));
  }

  /** One request per file: a file the server cannot read costs its own slot and nothing else. */
  private async embedMedia(
    paths: string[],
    audio: boolean,
    part: (bytes: Buffer) => object,
  ): Promise<Array<Float32Array | Error>> {
    if (this.role === "query") throw new Error("the query encoder reads text only");
    return mapLimit(paths, this.manager.mediaInFlight, async (path) => {
      let bytes: Buffer;
      try {
        bytes = await readFile(path);
      } catch (error) {
        return error instanceof Error ? error : new Error(String(error));
      }
      // The server takes any picture or sound in either slot; DigUp refuses the wrong kind.
      if (isAudio(bytes) !== audio) return new Error(`not ${audio ? "audio" : "an image"}: ${path}`);
      try {
        const answer = await this.call("/v1/embeddings", {
          input: [{ content: [part(bytes)] }],
          encoding_format: "float",
        });
        return vectorsOf(answer, 1)[0];
      } catch (error) {
        // The server answered about this file (or its vector was unusable). Anything else means the server is gone.
        if (error instanceof HttpError || error instanceof VectorError) {
          return new Error(`${(error as Error).message}: ${path}`.slice(0, 300));
        }
        throw error;
      }
    });
  }
}

/** The server's answer to an input longer than its micro-batch or slot. */
const TOO_LONG = /too large to process|larger than the max context/;

/** Whether llama.cpp reads these bytes as sound: WAV, MP3 or FLAC (mtmd-helper.cpp, is_audio_file). */
function isAudio(bytes: Buffer): boolean {
  const head = bytes.toString("latin1", 0, 12);
  return (
    (head.startsWith("RIFF") && head.slice(8, 12) === "WAVE") ||
    head.startsWith("ID3") ||
    head.startsWith("fLaC") ||
    (bytes.length >= 3 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  );
}

export class EmbedderManager {
  private readonly query_: Server;
  private readonly index_: Server;
  private readonly queryIdle: number;
  private readonly lingerSeconds: number;
  /** Between index() and doneIndexing(): the index server stays up. */
  private indexing = false;
  /** Bumped by stop(): handles from before it refuse work instead of starting a server again. */
  private generation = 0;

  constructor(o: EmbedderManagerOptions) {
    const ctx: Context = {
      serverBin: o.serverBin,
      textModel: o.textModel,
      mediaModel: o.mediaModel,
      logs: o.logs,
      log: o.log,
      portRange: o.portRange,
      startTimeoutMs: (o.startTimeoutSeconds ?? 120) * 1000,
      requestTimeoutMs: o.requestTimeoutMs ?? 300_000,
    };
    const slots = o.indexParallel ?? 1;
    // Any other count aborts the server in build_pooling (llama.cpp issue 18532).
    if (!Number.isInteger(slots) || slots < 1 || (slots & (slots - 1)) !== 0) {
      throw new Error(`indexParallel must be a power of two, not ${slots}`);
    }
    this.queryIdle = o.queryIdleSeconds ?? 600;
    this.lingerSeconds = o.indexLingerSeconds ?? 60;
    this.query_ = new Server({ name: "query", media: false, batch: QUERY_TOKENS, slots: 1 }, ctx);
    this.index_ = new Server({ name: "index", media: true, batch: INDEX_BATCH, slots }, ctx);
    // At once, not at the next start of that server: with nothing left to index, that start may never come.
    this.query_.reapStale();
    this.index_.reapStale();
  }

  get mediaInFlight(): number {
    return Math.max(MEDIA_IN_FLIGHT, this.index_.profile.slots);
  }

  /**
   * The text-only server, beside the index server when that runs (about 0.5 GB more while both do), so a query never
   * waits behind indexing (DigUp: Engine's query encoder). Starts it and waits until it answers.
   */
  async query(): Promise<Embedder> {
    const generation = this.generation;
    await this.query_.ensure();
    this.query_.arm(this.queryIdle);
    return new Handle(this, "query", generation);
  }

  /** The full server (text + images + audio). Cancels a pending stop. */
  async index(): Promise<Embedder> {
    const generation = this.generation;
    this.indexing = true;
    this.index_.cancelTimer();
    await this.index_.ensure();
    return new Handle(this, "index", generation);
  }

  /** Indexing is over: stop the index server after the linger, unless indexing starts again. */
  doneIndexing(): void {
    this.indexing = false;
    if (this.index_.state === "off") return;
    this.index_.arm(this.lingerSeconds);
  }

  /** Of the query server: what meaning search can do right now. */
  state(): EmbedderState {
    return this.query_.state;
  }

  /** Both servers, for status pages and tests. */
  servers(): { query: ServerInfo; index: ServerInfo } {
    return { query: this.query_.info(), index: this.index_.info() };
  }

  /** Stops the index server now (a job cut short): a request in flight on it fails; the next index() starts it again.
   *  The query server stays. */
  async stopIndexing(): Promise<void> {
    this.indexing = false;
    await this.index_.stop();
  }

  /** Stops both servers. Handles from before refuse work; query() and index() hand out new ones. */
  async stop(): Promise<void> {
    this.generation++;
    this.indexing = false;
    await Promise.all([this.query_.stop(), this.index_.stop()]);
  }

  /** Used by Handle: one request, on the right server, with the right timers. */
  send(role: "query" | "index", generation: number, path: string, body: unknown): Promise<unknown> {
    if (generation !== this.generation) return Promise.reject(new Error("the embedder was stopped: ask for it again"));
    if (role === "query") return this.query_.request(path, body, { idleSeconds: this.queryIdle });
    if (!this.indexing) return this.index_.request(path, body, { idleSeconds: this.lingerSeconds }); // a late one
    this.index_.cancelTimer();
    return this.index_.request(path, body);
  }
}
