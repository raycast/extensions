// Client for assets/digup-helper (docs/DESIGN.md, "Swift helper protocol"): one long-lived child, JSON lines in and
// out, one request in flight at a time. The child starts on the first call and restarts after it exits, times out or
// grows too big (DigUp's Watchdog: min(8 GiB, max(4 GiB, RAM / 2)), 15 minutes per file). The helper watches its own
// memory, as DigUp's does; the client watches the time.

import { constants as bufferConstants } from "node:buffer";
import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { totalmem } from "node:os";
import { dirname, join } from "node:path";
import type { Log } from "./log";

const GiB = 1024 ** 3;
/** DigUp: Watchdog.defaultTimeLimit, per file. */
export const HARD_TIMEOUT_MS = 15 * 60_000;
export const DEFAULT_OP_TIMEOUT_MS = HARD_TIMEOUT_MS;
/** Ops that read no file through: ping, power, previews, opening a file. */
export const QUICK_OP_TIMEOUT_MS = 60_000;
/** The helper exits with this when its memory passed the limit (DigUp: StoppedFile.exitCode). */
const MEMORY_EXIT_CODE = 75;

/** DigUp: Watchdog.defaultMemoryLimit. */
export function defaultMemoryLimit(): number {
  return Math.min(8 * GiB, Math.max(4 * GiB, totalmem() / 2));
}

/** DigUp's Watchdog wording: "15 minutes", "90 seconds". */
function describeTime(ms: number): string {
  return ms >= 120_000 ? `${Math.floor(ms / 60_000)} minutes` : `${Math.floor(ms / 1000)} seconds`;
}

/** DigUp's Watchdog wording: "8 GB", "512 MB". */
function describeSize(bytes: number): string {
  return bytes >= GiB ? `${(bytes / GiB).toFixed(0)} GB` : `${Math.floor(bytes / 1024 ** 2)} MB`;
}

/**
 * libmtmd.dylib of the llama.cpp build at `llamaServer`, for `HelperOptions.mtmdLibrary`: beside it (the release zip)
 * or in ../lib (Homebrew). Null when there is none.
 */
export function mtmdBeside(llamaServer: string): string | null {
  const folder = dirname(llamaServer);
  return [join(folder, "libmtmd.dylib"), join(folder, "../lib/libmtmd.dylib")].find((path) => existsSync(path)) ?? null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Request and reply shapes

export interface Size {
  width: number;
  height: number;
}

/** The UTType conformance DigUp's macOS classifier checks, in its order (`Files+Apple.swift:21-27`). */
export type WalkFileType = "sourceCode" | "pdf" | "image" | "movie" | "audio" | null;

export interface WalkArgs {
  roots: string[];
  /** Folder names never walked into (reason "developer folder"). */
  skipNames: string[];
  /** Folder name suffixes never walked into (".noindex": reason ".noindex folder"). */
  skipSuffixes: string[];
  /** Absolute folder paths left out, with everything under them. */
  excluded: string[];
  /** The home folder: `<home>/Library` is skipped. */
  home: string;
  /** Also apply the code index's folder rules (vendored or built code, submodules and worktrees). */
  code: boolean;
}

export interface WalkFile {
  path: string;
  size: number;
  /** Seconds since 1970. */
  mtime: number;
  inode: number;
  device: number;
  /** lstat says regular file; false for links and special files. */
  regular: boolean;
  /** A placeholder whose contents would be downloaded on read (`SF_DATALESS`). */
  dataless: boolean;
  /** An iCloud item that is not downloaded. */
  inCloud: boolean;
  type: WalkFileType;
  /** The `kMDItemIsScreenCapture` attribute is set (images only). */
  screenshotMarker: boolean;
}

export interface WalkDir {
  path: string;
  /** Holds a DigUp project marker (`.git`, `package.json`, `*.xcodeproj`, ...). Not computed for code walks. */
  projectRoot: boolean;
  /** `.git` is a folder ("dir") or a file ("file": a submodule or worktree). */
  gitDir: "dir" | "file" | null;
}

export interface WalkResult {
  /** Paths whose listing or metadata could not be read. Their existing rows must be retained. */
  failedPaths?: string[];
  files: WalkFile[];
  /** Every folder (roots included) that is a project root or has a `.git`; other folders are left out. */
  dirs: WalkDir[];
  /** Reason → count, for what the walk itself left out: "app or bundle" and the folder rules. */
  skipped: Record<string, number>;
}

export interface ImageArgs {
  path: string;
  screenshot: boolean;
  /** Soft-token budget the final picture is sized for (70, 140, 280, ...). */
  budget: number;
  /** Where the sized PNG goes. */
  out: string;
  /** Read the words with Vision (full resolution, original file). */
  ocr?: boolean;
  /** Smaller pictures are `tooSmall` (DigUp: 256). */
  minSide?: number;
}

export interface ImageTooSmall {
  tooSmall: true;
  width: number;
  height: number;
}

export interface ImageDone {
  tooSmall?: undefined;
  /** Stored pixel size, before the EXIF turn. */
  width: number;
  height: number;
  /** EXIF DateTimeOriginal as written by the camera ("2024:05:17 10:30:00"). */
  taken?: string;
  /** Size of the PNG at `out`. */
  sized: Size;
  ocr?: string;
}

export type ImageResult = ImageDone | ImageTooSmall;

export interface SizeArgs {
  path: string;
  budget: number;
  out: string;
}

export interface SizeResult {
  width: number;
  height: number;
  sized: Size;
}

export interface PdfArgs {
  path: string;
  /** 0-based first page, and the end (exclusive). */
  from: number;
  to: number;
  /** Pages with fewer characters are rendered (DigUp: 200). */
  minText?: number;
  /** Rendered page fits this square (DigUp: 1400). */
  renderPixels?: number;
  /** Soft-token budget of a rendered page (DigUp: 280). */
  budget?: number;
  /** Folder for the sized page PNGs. */
  outDir: string;
}

export interface PdfItem {
  /** 1-based. */
  number: number;
  /** The page's text (trimmed), or the OCR of its picture; "" for a page read in glyph order. */
  text: string;
  /** Text read in glyph order (Bengali, Hindi): good for a meaning vector, not for words. */
  garbled?: string;
  /** PNG of the page sized for the encoder; set when the page is a picture (scan, slide, glyph order). */
  image?: string;
  /** `text` came from OCR. */
  ocr?: boolean;
}

export interface PdfResult {
  /** Page count of the whole document. */
  pages: number;
  title?: string;
  /** Password-protected: `items` is empty. */
  locked?: boolean;
  items: PdfItem[];
}

export type RichType = "docx" | "doc" | "odt" | "rtf";

export interface AudioArgs {
  path: string;
  /** Folder for the WAV pieces. */
  outDir: string;
  /** Seconds (DigUp: 30, 25, 2). */
  window?: number;
  hop?: number;
  minimum?: number;
}

export interface MediaPiece {
  path: string;
  /** Seconds. */
  start: number;
  end: number;
}

export interface AudioResult {
  duration: number;
  pieces: MediaPiece[];
}

export interface VideoArgs extends AudioArgs {
  /** Seconds between frames (DigUp: 3). */
  interval?: number;
  /** Frames are cut to this long side before sizing (DigUp: 1024). */
  maxPixel?: number;
  maxFrames?: number;
  /** Soft-token budget of a frame (DigUp: 70). */
  budget?: number;
}

export interface VideoResult {
  duration: number;
  /** Frames sized for the encoder (PNG), one per shot. */
  frames: MediaPiece[];
  /** The soundtrack's windows. */
  pieces: MediaPiece[];
}

export interface ThumbArgs {
  path: string;
  out: string;
  maxPixel: number;
  /** Video: the frame at this second (±0.5 s). */
  time?: number;
  /** PDF: this page (1-based). */
  page?: number;
  /** PDF page: words to mark; the picture then shows the band around the first. */
  words?: string[];
  /** Audio: the stretch that matched [start, end] seconds, lit on a waveform PNG. */
  range?: [number, number];
}

export interface ThumbResult {
  path: string;
  width: number;
  height: number;
}

export type Thermal = "nominal" | "fair" | "serious" | "critical";

export interface PowerStatus {
  onBattery: boolean;
  lowPower: boolean;
  thermal: Thermal;
}

export interface OpenResult {
  how: "search" | "moment" | "plain";
}

export interface CallOptions {
  /** Capped at 15 minutes. */
  timeoutMs?: number;
  /** A request still waiting its turn when this aborts leaves the queue (one already sent runs to its end). */
  signal?: AbortSignal;
}

export interface HelperOptions {
  /** Default time limit of an op that reads a file (15 minutes). */
  timeoutMs?: number;
  /** Bytes of memory (footprint) the helper may use. */
  memoryLimit?: number;
  /**
   * libmtmd.dylib of the llama.cpp build the embedder runs (`mtmdBeside`). The helper decodes photos and video frames
   * with its stb_image, as DigUp's embedder does; without it ImageIO decodes, and about one photo in ten embeds a
   * little differently from DigUp (cosine 0.997-0.999).
   */
  mtmdLibrary?: string | null;
  /** A longer reply fails the request (default: the longest string V8 can make). */
  maxReplyBytes?: number;
}

// ---------------------------------------------------------------------------------------------------------------------

export type HelperErrorKind =
  /** The helper answered `ok: false`. */
  | "op"
  | "timeout"
  | "memory"
  /** The helper exited or was killed during the request. */
  | "crashed"
  | "spawn"
  | "closed";

export class HelperError extends Error {
  constructor(
    message: string,
    readonly kind: HelperErrorKind,
    readonly op: string,
  ) {
    super(message);
    this.name = "HelperError";
  }
}

interface Pending {
  id: number;
  op: string;
  line: string;
  timeoutMs: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  /** Takes the request out of the queue when its signal aborts. */
  forget?: () => void;
}

export class Helper {
  private readonly timeoutMs: number;
  private readonly memoryLimit: number;
  private readonly mtmdLibrary: string | null;
  private readonly maxReplyBytes: number;
  private readonly queue: Pending[] = [];
  private current: Pending | null = null;
  private child: ChildProcessWithoutNullStreams | null = null;
  private partial: Buffer[] = [];
  private partialBytes = 0;
  private stderrTail: string[] = [];
  private stderrPartial = "";
  private opTimer: NodeJS.Timeout | null = null;
  private nextId = 1;
  private closed = false;

  constructor(
    private readonly bin: string,
    private readonly log: Log,
    options: HelperOptions = {},
  ) {
    this.timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_OP_TIMEOUT_MS, HARD_TIMEOUT_MS);
    this.memoryLimit = Math.max(1, Math.floor(options.memoryLimit ?? defaultMemoryLimit()));
    this.mtmdLibrary = options.mtmdLibrary ?? null;
    this.maxReplyBytes = options.maxReplyBytes ?? bufferConstants.MAX_STRING_LENGTH;
  }

  /** Sends one request; resolves with the reply's fields (without `id` and `ok`). */
  call<T>(op: string, args: object = {}, options: CallOptions = {}): Promise<T> {
    if (this.closed) return Promise.reject(new HelperError("the helper is closed", "closed", op));
    const signal = options.signal;
    if (signal?.aborted) return Promise.reject(signal.reason);
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId++;
      const timeoutMs = Math.min(options.timeoutMs ?? this.timeoutMs, HARD_TIMEOUT_MS);
      const pending: Pending = { id, op, line: JSON.stringify({ ...args, id, op }) + "\n", timeoutMs, resolve, reject };
      if (signal) {
        const forget = () => {
          const at = this.queue.indexOf(pending);
          if (at >= 0) {
            this.queue.splice(at, 1);
            reject(signal.reason);
          }
        };
        signal.addEventListener("abort", forget, { once: true });
        pending.forget = () => signal.removeEventListener("abort", forget);
        const settle =
          <V>(done: (value: V) => void) =>
          (value: V) => {
            pending.forget?.();
            done(value);
          };
        pending.resolve = settle(resolve);
        pending.reject = settle(reject);
      }
      this.queue.push(pending);
      this.pump();
    });
  }

  walk(args: WalkArgs, options?: CallOptions) {
    return this.call<WalkResult>("walk", args, options);
  }

  image(args: ImageArgs, options?: CallOptions) {
    return this.call<ImageResult>("image", { ocr: false, minSide: 256, ...args }, options);
  }

  size(args: SizeArgs, options?: CallOptions) {
    return this.call<SizeResult>("size", args, options);
  }

  pdf(args: PdfArgs, options?: CallOptions) {
    return this.call<PdfResult>("pdf", { minText: 200, renderPixels: 1400, budget: 280, ...args }, options);
  }

  rich(path: string, type: RichType, options?: CallOptions) {
    return this.call<{ text: string }>("rich", { path, type }, options);
  }

  audio(args: AudioArgs, options?: CallOptions) {
    return this.call<AudioResult>("audio", { window: 30, hop: 25, minimum: 2, ...args }, options);
  }

  video(args: VideoArgs, options?: CallOptions) {
    const defaults = { interval: 3, maxPixel: 1024, maxFrames: 1200, budget: 70, window: 30, hop: 25, minimum: 2 };
    return this.call<VideoResult>("video", { ...defaults, ...args }, options);
  }

  /** Falls back to the file's own picture (Quick Look) when the frame, page or waveform can't be drawn, as DigUp does. */
  thumb(args: ThumbArgs, options?: CallOptions) {
    return this.call<ThumbResult>("thumb", args, { timeoutMs: QUICK_OP_TIMEOUT_MS, ...options });
  }

  /**
   * For the folder estimate (DigUp: Estimator.pages): each PDF's page count from Spotlight, else from the file, else 1.
   */
  async pages(paths: string[], options?: CallOptions): Promise<number[]> {
    return (await this.call<{ pages: number[] }>("pages", { paths }, options)).pages;
  }

  /**
   * For the folder estimate (DigUp: Estimator.duration): each recording's seconds from Spotlight, else AVFoundation,
   * else ffprobe, else 0. Pass only files that are on the Mac: reading an iCloud placeholder downloads it.
   */
  async durations(paths: string[], options?: CallOptions): Promise<number[]> {
    return (await this.call<{ seconds: number[] }>("duration", { paths }, options)).seconds;
  }

  /** Opens a PDF with the landmark word searched in its app (page > 1); plainly otherwise. */
  openPdf(path: string, page: number, words: string[], options?: CallOptions) {
    return this.call<OpenResult>("openPdf", { path, page, words }, { timeoutMs: QUICK_OP_TIMEOUT_MS, ...options });
  }

  /** `player`: a bundle id, or null for the file's default app. */
  openMedia(path: string, seconds: number, player: string | null, options?: CallOptions) {
    return this.call<OpenResult>(
      "openMedia",
      { path, seconds, player },
      { timeoutMs: QUICK_OP_TIMEOUT_MS, ...options },
    );
  }

  power() {
    return this.call<PowerStatus>("power", {}, { timeoutMs: QUICK_OP_TIMEOUT_MS });
  }

  ping() {
    return this.call<{ version: string }>("ping", {}, { timeoutMs: QUICK_OP_TIMEOUT_MS });
  }

  /** Ends the child and fails what is queued. Later calls fail. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const closed = (op: string) => new HelperError("the helper is closed", "closed", op);
    for (const pending of this.queue.splice(0)) pending.reject(closed(pending.op));
    const child = this.child;
    if (this.current) this.finish(this.current, closed(this.current.op));
    this.child = null;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>((done) => {
      const killer = setTimeout(() => killTree(child), 2000);
      child.once("exit", () => {
        clearTimeout(killer);
        done();
      });
      child.stdin.end();
    });
  }

  // ------------------------------------------------------------------------------------------------------------------

  private pump(): void {
    if (this.current || this.closed) return;
    const next = this.queue.shift();
    if (!next) return;
    const child = this.child ?? this.start();
    this.current = next;
    this.opTimer = setTimeout(() => this.timedOut(next), next.timeoutMs);
    child.stdin.write(next.line);
  }

  private start(): ChildProcessWithoutNullStreams {
    const args = ["serve", "--memory-limit", String(this.memoryLimit)];
    if (this.mtmdLibrary) args.push("--mtmd", this.mtmdLibrary);
    const child = spawn(this.bin, args, { stdio: ["pipe", "pipe", "pipe"] });
    this.child = child;
    this.partial = [];
    this.partialBytes = 0;
    this.stderrTail = [];
    this.stderrPartial = "";
    child.stdin.on("error", () => {}); // a dead child shows up in "exit"/"error"
    child.stdout.on("data", (chunk: Buffer) => {
      if (this.child === child) this.onData(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => this.onStderr(chunk));
    child.on("error", (error: NodeJS.ErrnoException) => {
      const missing = error.code === "ENOENT";
      const message = missing
        ? `helper binary missing at ${this.bin} (build it with scripts/build-helper.sh)`
        : `can't start the helper: ${error.message}`;
      this.lost(child, new HelperError(message, "spawn", this.current?.op ?? "spawn"));
    });
    child.on("exit", (code, signal) => {
      const op = this.current?.op ?? "helper";
      if (code === MEMORY_EXIT_CODE) {
        const limit = describeSize(this.memoryLimit);
        if (this.child === child)
          this.log.warn(`helper: ${op} needed more than ${limit} of memory; restarting the helper`);
        this.lost(child, new HelperError(`needed more than ${limit} of memory to read`, "memory", op));
        return;
      }
      const tail = this.stderrTail.length > 0 ? `: ${this.stderrTail[this.stderrTail.length - 1]}` : "";
      const how = signal ? `was killed (${signal})` : `exited with code ${code}`;
      this.lost(child, new HelperError(`the helper ${how}${tail}`, "crashed", op));
    });
    return child;
  }

  /** The child is gone: fail what it was doing and let the next call start a new one. */
  private lost(child: ChildProcessWithoutNullStreams, error: HelperError): void {
    if (this.child !== child) return;
    this.child = null;
    if (this.current) this.finish(this.current, error);
    else this.log.warn(`helper: ${error.message}`);
    this.pump();
  }

  private finish(pending: Pending, error: Error | null, value?: unknown): void {
    if (this.current !== pending) return;
    this.current = null;
    if (this.opTimer) clearTimeout(this.opTimer);
    this.opTimer = null;
    if (error) pending.reject(error);
    else pending.resolve(value);
  }

  private timedOut(pending: Pending): void {
    if (this.current !== pending) return;
    const limit = describeTime(pending.timeoutMs);
    this.log.warn(`helper: ${pending.op} took more than ${limit}; restarting the helper`);
    this.kill(new HelperError(`took more than ${limit} to read`, "timeout", pending.op));
  }

  /** Kills the child now, fails the request in flight with `error`, and starts clean on the next call. */
  private kill(error: HelperError): void {
    const child = this.child;
    this.child = null;
    if (this.current) this.finish(this.current, error);
    if (child) killTree(child);
    this.pump();
  }

  private onData(chunk: Buffer): void {
    let start = 0;
    for (;;) {
      const newline = chunk.indexOf(0x0a, start);
      const end = newline < 0 ? chunk.length : newline;
      this.partialBytes += end - start;
      if (this.partialBytes > this.maxReplyBytes) return this.tooLarge();
      if (newline < 0) {
        if (start < chunk.length) this.partial.push(chunk.subarray(start));
        return;
      }
      this.partial.push(chunk.subarray(start, newline));
      const bytes = this.partial.length === 1 ? this.partial[0] : Buffer.concat(this.partial);
      this.partial = [];
      this.partialBytes = 0;
      start = newline + 1;
      if (bytes.length > 0 && !this.onLine(bytes)) return;
    }
  }

  /** A reply past V8's string limit would throw where nothing catches it and end the process: fail it first. */
  private tooLarge(): void {
    this.partial = [];
    this.partialBytes = 0;
    const op = this.current?.op ?? "helper";
    const limit = describeSize(this.maxReplyBytes);
    this.log.warn(`helper: the reply to ${op} passed ${limit}; restarting the helper`);
    this.kill(new HelperError(`the reply was too large to read (more than ${limit})`, "op", op));
  }

  /** False when the line broke the protocol and the child was killed. */
  private onLine(bytes: Buffer): boolean {
    let reply: { id?: number; ok?: boolean; error?: string; [key: string]: unknown };
    try {
      reply = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      // Replies come on a stream of their own (logs go to stderr): a line that isn't JSON is a broken helper.
      const op = this.current?.op ?? "helper";
      this.log.warn(`helper: unreadable reply to ${op}: ${bytes.subarray(0, 200).toString("utf8")}`);
      this.kill(new HelperError(`the helper's reply could not be read (${(error as Error).message})`, "op", op));
      return false;
    }
    const pending = this.current;
    // The helper answers a request it can't parse with id 0. One request is in flight at a time: it is that one.
    const unparsed = reply.ok === false && (reply.id === 0 || reply.id === undefined);
    if (!pending || (reply.id !== pending.id && !unparsed)) {
      this.log.warn(`helper: reply ${String(reply.id)} matches no request`);
      return true;
    }
    if (reply.ok) {
      const { id: _id, ok: _ok, ...fields } = reply;
      this.finish(pending, null, fields);
    } else {
      this.finish(pending, new HelperError(reply.error ?? "the helper failed", "op", pending.op));
    }
    this.pump();
    return true;
  }

  private onStderr(chunk: Buffer): void {
    const lines = (this.stderrPartial + chunk.toString("utf8")).split("\n");
    this.stderrPartial = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      this.stderrTail.push(line);
      if (this.stderrTail.length > 5) this.stderrTail.shift();
      this.log.info(`helper: ${line}`);
    }
  }
}

/**
 * Kills the helper and the tools it runs. Foundation gives each child its own process group, so ffmpeg would outlive a
 * killed helper and go on writing frames: stop the helper (it starts no new child then), kill its children, then it.
 */
function killTree(child: ChildProcessWithoutNullStreams): void {
  const pid = child.pid;
  if (pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  try {
    process.kill(pid, "SIGSTOP");
  } catch {
    return; // already gone
  }
  execFile("/usr/bin/pgrep", ["-P", String(pid)], (_error, stdout) => {
    for (const line of String(stdout).split("\n")) {
      const childPid = Number.parseInt(line, 10);
      if (childPid > 0) {
        try {
          process.kill(childPid, "SIGKILL");
        } catch {
          // ended on its own
        }
      }
    }
    child.kill("SIGKILL");
  });
}
