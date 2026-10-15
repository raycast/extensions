// Finds and installs what the embedder runs on: llama.cpp's llama-server and the two EmbeddingGemma 2 GGUF files.
// Nothing here talks to the network except installLlama and installModels (DigUp: ModelFiles.swift, FileFetcher.swift,
// ModelDownload.swift).

import { execFile, spawnSync } from "node:child_process";
import {
  constants,
  createReadStream,
  createWriteStream,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  statfsSync,
} from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import type { Log } from "./log";
import type { Paths } from "./paths";

// ---------------------------------------------------------------------------------------------------------------------
// What we pin
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The llama.cpp build Dig Up pins: it makes DigUp's reference vectors (DigUp pins b11461) without b11461's 1 MiB-per-token
 * logits buffer (fixed in b11584), so the index server holds 1.2 GB instead of 2.3 GB (docs/baseline/llama-build-choice.md).
 * EmbeddingGemma 2 arrived in b11452 (llama.cpp PR #30054).
 */
export const LLAMA_BUILD = 11624;
export const LLAMA_MIN_BUILD = 11452;

export interface LlamaRelease {
  url: string;
  sha256: string;
  /** The folder inside the tarball (and inside `llamaDir`) that holds `llama-server`. */
  dir: string;
}

export const LLAMA_RELEASE: LlamaRelease = {
  url: `https://github.com/ggml-org/llama.cpp/releases/download/b${LLAMA_BUILD}/llama-b${LLAMA_BUILD}-bin-macos-arm64.tar.gz`,
  sha256: "5bd8555c20e5d6d45831c038f484769245e5bcc1c265c4911c6ae15e4d9a35df",
  dir: `llama-b${LLAMA_BUILD}`,
};

export interface ModelFile {
  name: string;
  bytes: number;
  sha256: string;
  url: string;
}

export const MODEL_REPOSITORY = "ggml-org/embeddinggemma-2-GGUF";
export const MODEL_REVISION = "bfcd298762cc34d0357ece5ebdd31791a3a374d8";

function modelFile(name: string, bytes: number, sha256: string): ModelFile {
  return { name, bytes, sha256, url: `https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/${name}` };
}

// Q8_0 only: the model's activations overflow float16 (DigUp: ModelFiles.swift).
export const TEXT_MODEL = modelFile(
  "embeddinggemma-2-Q8_0.gguf",
  309_855_456,
  "2188ac1deca4b77dffefd603c2776a9d76d9d74ec01841392982ebb840b09135",
);
export const MEDIA_MODEL = modelFile(
  "mmproj-embeddinggemma-2-Q8_0.gguf",
  554_821_024,
  "c4a8a52691ecef40618438928bdf9e68379b854e24166f292592353db0aab64f",
);

export interface ModelFiles {
  text: ModelFile;
  media: ModelFile;
}
export const MODEL_FILES: ModelFiles = { text: TEXT_MODEL, media: MEDIA_MODEL };

/**
 * Same shape as SetupState's "downloading" and "verifying"; "retrying" is DigUp's "Waiting for the network…" (a network
 * problem, tried again by itself). `bytes` and `total` cover the whole job.
 */
export interface InstallProgress {
  phase: "downloading" | "verifying" | "retrying";
  what: string;
  bytes: number;
  total: number;
  /** "retrying": the problem it waits out. */
  error?: string;
}
export type ProgressFn = (progress: InstallProgress) => void;

/** "865 MB", "1.06 GB": Foundation's ByteCountFormatter, `.file` style (DigUp: ModelDownload.bytes), in English. */
export function formatBytes(count: number): string {
  if (count === 0) return "Zero KB";
  if (count < 1000) return count === 1 ? "1 byte" : `${count} bytes`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  for (let unit = 0; ; unit++) {
    const decimals = Math.min(unit, 2); // KB none, MB one, GB and up two
    // Divide the integer by a power of ten, so a half rounds up as Foundation's does (1,255,000,000 is 1.26 GB).
    const rounded = Math.round(count / 10 ** (3 * (unit + 1) - decimals)) / 10 ** decimals;
    if (rounded < 1000 || unit === units.length - 1) return `${rounded} ${units[unit]}`;
  }
}

/** "~/Library/…" for a path in the home folder (DigUp: tildePath). */
function tildePath(path: string, home: string): string {
  if (path === home) return "~";
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** Creates `folder`, or fails with DigUp's "Can't create <folder>" (the reason goes to the log). */
async function makeFolder(folder: string, home: string, log?: Log): Promise<void> {
  try {
    await mkdir(folder, { recursive: true });
  } catch (error) {
    log?.error(`install: can't create ${folder}: ${(error as Error).message}`);
    throw new Error(`Can't create ${tildePath(folder, home)}`);
  }
}

/** Running installs by folder: two at once would write the same .partial (DigUp: ModelDownload.start). */
const running = new Map<string, Promise<unknown>>();

/** `work`, unless a job for `folder` runs already: then that job's promise (and its progress reports only). */
function oneAtATime<T>(folder: string, work: () => Promise<T>): Promise<T> {
  const current = running.get(folder);
  if (current) return current as Promise<T>;
  const job = work().finally(() => running.delete(folder));
  running.set(folder, job);
  return job;
}

// ---------------------------------------------------------------------------------------------------------------------
// llama-server
// ---------------------------------------------------------------------------------------------------------------------

export type LlamaLookup =
  | {
      bin: string;
      build: number;
      /** Why the override was passed over for the installed release, when it was. */
      ignored?: string;
    }
  | { bin: null; reason: string };

const versionCache = new Map<string, LlamaLookup>();

/** Checks one llama-server file: it runs, and its build can load EmbeddingGemma 2. */
function checkLlama(bin: string): LlamaLookup {
  let stat;
  try {
    stat = statSync(bin);
  } catch {
    return { bin: null, reason: `no llama-server at ${bin}` };
  }
  if (!stat.isFile()) return { bin: null, reason: `${bin} is not a file` };
  const key = `${bin}:${stat.mtimeMs}:${stat.size}`;
  const cached = versionCache.get(key);
  if (cached) return cached;

  // The build line goes to stderr or stdout depending on the version.
  const run = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 20_000 });
  let result: LlamaLookup;
  if (run.error) {
    result = { bin: null, reason: `can't run ${bin}: ${run.error.message}` };
  } else {
    const build = /build[ :]*(\d+)/.exec(`${run.stdout}\n${run.stderr}`)?.[1];
    if (!build) {
      // A missing dylib shows up here (dyld's message is the first line).
      const said = `${run.stderr}`.trim().split("\n")[0];
      result = {
        bin: null,
        reason: `can't read the build number of ${bin} (exit ${run.status})${said ? `: ${said}` : ""}`,
      };
    } else if (Number(build) < LLAMA_MIN_BUILD) {
      result = {
        bin: null,
        reason: `${bin} is build ${build}; EmbeddingGemma 2 needs build ${LLAMA_MIN_BUILD} or newer`,
      };
    } else {
      result = { bin, build: Number(build) };
    }
  }
  versionCache.set(key, result);
  return result;
}

export function defaultLlamaBin(paths: Paths, release: LlamaRelease = LLAMA_RELEASE): string {
  return join(paths.llamaDir, release.dir, "llama-server");
}

/**
 * The llama-server to run: the override when it works, else the release installLlama puts in `llamaDir`. When neither
 * works, null and why.
 */
export function findLlama(paths: Paths, override: string | null, release: LlamaRelease = LLAMA_RELEASE): LlamaLookup {
  const installed = defaultLlamaBin(paths, release);
  if (!override || override === installed) return checkLlama(installed);
  const chosen = checkLlama(override);
  if (chosen.bin !== null) return chosen;
  const fallback = checkLlama(installed);
  if (fallback.bin !== null) return { ...fallback, ignored: chosen.reason };
  return { bin: null, reason: `${chosen.reason}; ${fallback.reason}` };
}

/** DESIGN's `locateLlama`: the path, or null (ask `findLlama` for the reason). */
export function locateLlama(paths: Paths, override: string | null): string | null {
  return findLlama(paths, override).bin;
}

export interface InstallLlamaOptions {
  release?: LlamaRelease;
  log?: Log;
  signal?: AbortSignal;
  /** Waits between tries after a network problem; the last value repeats (default as for the model). */
  retryDelaysMs?: number[];
  /** Give up after this many tries in a row that added no bytes (default: never). */
  maxFailures?: number;
  home?: string;
}

/**
 * Downloads llama.cpp's macOS arm64 release, checks its SHA-256, and unpacks it into `llamaDir`. Returns the path of
 * llama-server. Does nothing when a good one is already there. A call while one runs for the same folder gets that
 * one's promise.
 */
export function installLlama(paths: Paths, progress: ProgressFn, o: InstallLlamaOptions = {}): Promise<string> {
  return oneAtATime(paths.llamaDir, () => installLlamaNow(paths, progress, o));
}

async function installLlamaNow(paths: Paths, progress: ProgressFn, o: InstallLlamaOptions): Promise<string> {
  const release = o.release ?? LLAMA_RELEASE;
  const existing = findLlama(paths, null, release);
  if (existing.bin) return existing.bin;

  await makeFolder(paths.llamaDir, o.home ?? homedir(), o.log);
  const archive = join(paths.llamaDir, `${release.dir}.tar.gz`);
  const partial = `${archive}.partial`;
  const what = release.dir;
  // Only the hash is pinned, not the size: a download that finished before an earlier run stopped is told by its hash.
  if (sizeOf(partial) === 0 || (await sha256(partial)) !== release.sha256) {
    let total = 0;
    await download({
      url: release.url,
      source: "GitHub",
      saving: "llama.cpp",
      partial,
      bytes: null,
      what,
      report: (bytes, size) => {
        total = size;
        progress({ phase: "downloading", what, bytes, total });
      },
      waiting: (error) => progress({ phase: "retrying", what, bytes: sizeOf(partial), total, error }),
      log: o.log,
      signal: o.signal,
      retryDelaysMs: o.retryDelaysMs,
      maxFailures: o.maxFailures,
    });
  }
  const size = sizeOf(partial);
  progress({ phase: "verifying", what, bytes: size, total: size });
  if ((await sha256(partial)) !== release.sha256) {
    rmSync(partial, { force: true });
    throw new Error("The llama.cpp download failed its checksum");
  }
  renameSync(partial, archive);

  const staging = join(paths.llamaDir, `.unpack-${process.pid}`);
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  try {
    await unpackRelease(archive, staging, release.dir);
    // Nothing from a browser, but unpacking elsewhere may have marked it; a quarantined binary will not start.
    await run("/usr/bin/xattr", ["-dr", "com.apple.quarantine", join(staging, release.dir)]).catch(() => {});
    const target = join(paths.llamaDir, release.dir);
    rmSync(target, { recursive: true, force: true });
    renameSync(join(staging, release.dir), target);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  rmSync(archive, { force: true });

  const installed = findLlama(paths, null, release);
  if (installed.bin === null) throw new Error(`llama.cpp is unpacked but unusable: ${installed.reason}`);
  return installed.bin;
}

/** Unpacks only a tarball whose every entry sits inside `dir` (the archive is checksummed, but belt and braces). */
async function unpackRelease(archive: string, into: string, dir: string): Promise<void> {
  const listing = await run("/usr/bin/tar", ["-tzf", archive]);
  for (const entry of listing.split("\n").filter(Boolean)) {
    const parts = entry.split("/");
    if (entry.startsWith("/") || parts.includes("..") || parts[0] !== dir) {
      throw new Error(`The llama.cpp archive holds an unexpected path: ${entry}`);
    }
  }
  await run("/usr/bin/tar", ["-xzf", archive, "-C", into]);
}

function run(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 64 << 20 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${file} failed: ${stderr.trim() || error.message}`));
      else resolve(stdout);
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------------------------------------------------

export interface LocateOptions {
  files?: ModelFiles;
  home?: string;
  env?: Record<string, string | undefined>;
}

/** The pinned revision's folder in the Hugging Face cache: `$HF_HUB_CACHE`, `$HF_HOME/hub`, or ~/.cache/huggingface/hub. */
export function huggingFaceSnapshot(o: LocateOptions = {}): string {
  const env = o.env ?? process.env;
  const hub =
    env.HF_HUB_CACHE || (env.HF_HOME ? join(env.HF_HOME, "hub") : join(o.home ?? homedir(), ".cache/huggingface/hub"));
  return join(hub, `models--${MODEL_REPOSITORY.replace("/", "--")}`, "snapshots", MODEL_REVISION);
}

/** `file` in `folder` when it is there at its exact size (the checksum is for the installer). */
function sizedFile(folder: string, file: ModelFile): string | null {
  try {
    const path = realpathSync(join(folder, file.name)); // Hugging Face snapshots hold symlinks to blobs
    return statSync(path).size === file.bytes ? path : null;
  } catch {
    return null;
  }
}

/**
 * The folders to look in, first match wins. A chosen folder is the only one then, as DigUp's `$DIGUP_MODELS` is: another
 * copy (the Hugging Face cache) mustn't hide that the chosen one lacks a file (DigUp: LlamaModels.folders).
 */
function modelFolders(paths: Paths, override: string | null, o: LocateOptions): string[] {
  if (override) return [override];
  return [
    paths.modelsDir,
    join(o.home ?? homedir(), "Library/Application Support/DigUp/Models"), // DigUp.app's own copy
    huggingFaceSnapshot(o),
  ];
}

export type ModelLookup =
  | {
      text: string;
      /** Null while only the text part is there (queries still work). */
      media: string | null;
      /** Why `media` is null. */
      reason?: string;
    }
  | { text: null; media: null; reason: string };

/** Why `missing` (text first) isn't in the chosen folder, in DigUp's words for files chosen by hand (ModelDownload.use). */
function chosenReason(folder: string, missing: ModelFile[], home: string): string {
  for (const file of missing) {
    const size = sizeOf(join(folder, file.name));
    if (size > 0) return `The chosen ${file.name} is ${formatBytes(size)}, not ${formatBytes(file.bytes)}`;
  }
  return missing.length === 2
    ? "Those aren't the model's files"
    : `no ${missing[0].name} in ${tildePath(folder, home)}`;
}

/** Where the model files are, or why they aren't there. */
export function findModels(paths: Paths, override: string | null, o: LocateOptions = {}): ModelLookup {
  const files = o.files ?? MODEL_FILES;
  const folders = modelFolders(paths, override, o);
  const find = (file: ModelFile) => {
    for (const folder of folders) {
      const found = sizedFile(folder, file);
      if (found) return found;
    }
    return null;
  };
  const text = find(files.text);
  const media = find(files.media);
  const missing = [...(text ? [] : [files.text]), ...(media ? [] : [files.media])];
  if (missing.length === 0) return { text: text!, media };
  const home = o.home ?? homedir();
  // Without a chosen folder, DigUp's own wording (LlamaModels.locate).
  const reason = override
    ? chosenReason(override, missing, home)
    : `no ${missing[0].name} in ${folders.map((folder) => tildePath(folder, home)).join(", ")}`;
  return text ? { text, media: null, reason } : { text: null, media: null, reason };
}

/** DESIGN's `locateModels`: where the model files are, or null (ask `findModels` for the reason). */
export function locateModels(
  paths: Paths,
  override: string | null,
  o: LocateOptions = {},
): { text: string; media: string | null } | null {
  const found = findModels(paths, override, o);
  return found.text === null ? null : { text: found.text, media: found.media };
}

export interface InstallModelsOptions extends LocateOptions {
  log?: Log;
  signal?: AbortSignal;
  /** Waits between tries after a network problem; the last value repeats. DigUp: 2 s, 5 s, 15 s, then 30 s. */
  retryDelaysMs?: number[];
  /**
   * Give up after this many tries in a row that added no bytes. Default: never, as DigUp, which keeps saying "Waiting
   * for the network…" (the "retrying" reports) until it is back; `signal` stops it.
   */
  maxFailures?: number;
  /** Keep the folder out of Time Machine, as DigUp does (the files can always be downloaded again). */
  excludeFromBackup?: boolean;
  /** Free space to leave beyond the files (DigUp: 200 MB). */
  spareBytes?: number;
}

/**
 * Puts both model files into `paths.modelsDir`: a copy from the Hugging Face cache when it has the file, else a
 * resumable download. A file gets its real name only after its size and SHA-256 check out, so a file under its real
 * name is always whole. A call while one runs for the same folder gets that one's promise.
 */
export function installModels(
  paths: Paths,
  progress: ProgressFn,
  o: InstallModelsOptions = {},
): Promise<{ text: string; media: string }> {
  return oneAtATime(paths.modelsDir, () => installModelsNow(paths, progress, o));
}

async function installModelsNow(
  paths: Paths,
  progress: ProgressFn,
  o: InstallModelsOptions,
): Promise<{ text: string; media: string }> {
  const files = o.files ?? MODEL_FILES;
  const list = [files.text, files.media];
  const folder = paths.modelsDir;
  await makeFolder(folder, o.home ?? homedir(), o.log);
  if (o.excludeFromBackup !== false) await run("/usr/bin/tmutil", ["addexclusion", folder]).catch(() => {});

  const total = list.reduce((sum, file) => sum + file.bytes, 0);
  let base = 0;
  const result: string[] = [];
  for (const [index, file] of list.entries()) {
    const final = join(folder, file.name);
    const partial = `${final}.partial`;
    if (sizeOf(final) === file.bytes) {
      result.push(final);
      base += file.bytes;
      continue;
    }
    const missing = list.slice(index).filter((later) => sizeOf(join(folder, later.name)) !== later.bytes);
    checkSpace(folder, missing, partial, o.spareBytes ?? 200_000_000, o.log);
    const onDisk = () => base + Math.min(sizeOf(partial), file.bytes);
    for (let attempt = 1; ; attempt++) {
      const cached = attempt === 1 ? sizedFile(huggingFaceSnapshot(o), file) : null;
      if (!cached || !(await copyCached(cached, partial, file, o.log))) {
        await download({
          url: file.url,
          source: "Hugging Face",
          saving: "the model",
          partial,
          bytes: file.bytes,
          what: file.name,
          report: (written) => progress({ phase: "downloading", what: file.name, bytes: base + written, total }),
          waiting: (error) => progress({ phase: "retrying", what: file.name, bytes: onDisk(), total, error }),
          log: o.log,
          signal: o.signal,
          retryDelaysMs: o.retryDelaysMs,
          maxFailures: o.maxFailures,
        });
      }
      progress({ phase: "verifying", what: file.name, bytes: base + file.bytes, total });
      if (sizeOf(partial) === file.bytes && (await sha256(partial)) === file.sha256) break;
      // Bad bytes under a good size: start over once, then leave it to the user.
      rmSync(partial, { force: true });
      o.log?.warn(`model: ${file.name} failed its check${attempt >= 2 ? " again" : ", downloading it again"}`);
      if (attempt >= 2) throw new Error("The download was damaged twice. Try again later.");
    }
    renameSync(partial, final);
    result.push(final);
    base += file.bytes;
  }
  return { text: result[0], media: result[1] };
}

/** The Hugging Face cache's copy as the partial (an APFS clone where it can: no time, no space). False if it failed. */
async function copyCached(cached: string, partial: string, file: ModelFile, log?: Log): Promise<boolean> {
  try {
    rmSync(partial, { force: true });
    await copyFile(cached, partial, constants.COPYFILE_FICLONE);
    log?.info(`model: ${file.name} copied from the Hugging Face cache`);
    return true;
  } catch (error) {
    log?.warn(`model: ${file.name} is in the Hugging Face cache but couldn't be copied: ${(error as Error).message}`);
    return false;
  }
}

function sizeOf(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

/** DigUp: the files still missing, less what the partial already holds, plus spare room. */
function checkSpace(folder: string, missing: ModelFile[], partial: string, spare: number, log?: Log): void {
  let free: number;
  try {
    const fs = statfsSync(folder);
    free = fs.bavail * fs.bsize;
  } catch {
    return; // can't tell: try
  }
  const needed = missing.reduce((sum, file) => sum + file.bytes, 0) - sizeOf(partial) + spare;
  if (free >= needed) return;
  log?.error(`model: needs ${formatBytes(needed)} free, ${formatBytes(free)} is free`);
  throw new Error(`Needs ${formatBytes(needed)} free on this disk`);
}

/** The SHA-256 of a file as lowercase hex, read in 8 MB pieces. */
export async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path, { highWaterMark: 8 << 20 })) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

// ---------------------------------------------------------------------------------------------------------------------
// Download (DigUp: FileFetcher.swift, and ModelDownload.swift's retries)
// ---------------------------------------------------------------------------------------------------------------------

class DownloadError extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
  }
}

interface DownloadJob {
  url: string;
  /** Who answers, for "Hugging Face answered 503" (DigUp: FileFetcher). */
  source: string;
  /** What is being saved, for "Can't save the model: …". */
  saving: string;
  /** `<name>.partial`: what an interrupted download left, and where this one writes. */
  partial: string;
  /** The file's exact size, or null when only its checksum is pinned (then the server's answer gives it). */
  bytes: number | null;
  what: string;
  /** Bytes on disk and the file's size (0 while unknown): at most every 0.2 s, and at the end of each try. */
  report: (written: number, size: number) => void;
  /** A network problem, about to be tried again after a wait. */
  waiting?: (error: string) => void;
  log?: Log;
  signal?: AbortSignal;
  retryDelaysMs?: number[];
  maxFailures?: number;
}

const IDLE_MS = 60_000; // no bytes for a minute: fail, then retry from where it stopped
const MAX_REDIRECTS = 10;

/** Downloads `job.url` into `job.partial`, resuming what is there and retrying network trouble. */
async function download(job: DownloadJob): Promise<void> {
  const delays = job.retryDelaysMs ?? [2000, 5000, 15_000, 30_000];
  const maxFailures = job.maxFailures ?? Number.POSITIVE_INFINITY;
  let failures = 0;
  for (;;) {
    const before = sizeOf(job.partial);
    try {
      return await fetchOnce(job);
    } catch (error) {
      if (job.signal?.aborted) throw error;
      // DigUp stops at once: waiting doesn't free a disk or grant a permission (FileFetcher.swift).
      if (isDiskError(error)) throw new DownloadError(`Can't save ${job.saving}: ${(error as Error).message}`, false);
      const retry = error instanceof DownloadError ? error.retry : true; // anything else is the network
      if (!retry) throw error;
      failures = sizeOf(job.partial) > before ? 1 : failures + 1;
      if (failures > maxFailures) throw error;
      const message = error instanceof Error ? error.message : String(error);
      const delay = delays[Math.min(failures - 1, delays.length - 1)] ?? 0;
      job.log?.warn(`download: ${job.what}: ${message}; trying again in ${Math.round(delay / 1000)} s`);
      job.waiting?.(message);
      await sleep(delay, job.signal);
    }
  }
}

/**
 * An error of the file being written (EACCES, ENOSPC, EROFS…), not of the network: Node's file calls name their system
 * call, and fetch's errors (TypeError "fetch failed", "terminated") don't.
 */
function isDiskError(error: unknown): boolean {
  const syscall = (error as NodeJS.ErrnoException | null)?.syscall;
  return syscall !== undefined && ["open", "write", "close", "fsync", "rm", "unlink"].includes(syscall);
}

async function fetchOnce(job: DownloadJob): Promise<void> {
  const { partial } = job;
  let size = job.bytes;
  let written = sizeOf(partial);
  if (size !== null && written > size) {
    rmSync(partial, { force: true });
    written = 0;
  }
  if (size !== null && written === size) return;

  const idle = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => idle.abort(new Error("No data for a minute")), IDLE_MS);
  };
  const signal = job.signal ? AbortSignal.any([job.signal, idle.signal]) : idle.signal;
  touch();
  try {
    const response = await get(job.url, written, signal);
    const status = response.status;
    if (status === 206) {
      const range = response.headers.get("content-range") ?? "";
      if (!range.startsWith(`bytes ${written}-`)) {
        // Not where we asked: start the file over next time.
        await response.body?.cancel();
        rmSync(partial, { force: true });
        throw new DownloadError("The download couldn't resume", true);
      }
      size ??= Number(/\/(\d+)$/.exec(range)?.[1]) || null;
    } else if (status === 200) {
      written = 0; // the whole file, from the start
      size ??= Number(response.headers.get("content-length")) || null;
    } else if (status === 416) {
      // Asked to resume past the end of a file whose size was not pinned: start over.
      await response.body?.cancel();
      rmSync(partial, { force: true });
      throw new DownloadError("The download couldn't resume", true);
    } else {
      await response.body?.cancel();
      throw new DownloadError(`${job.source} answered ${status}`, status === 429 || status >= 500);
    }
    if (!response.body) throw new DownloadError("The download had no body", true);

    let reported = 0;
    const report = (force: boolean) => {
      const now = Date.now();
      if (!force && now - reported < 200) return;
      reported = now;
      job.report(written, size ?? 0);
    };
    const count = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        written += chunk.length;
        touch();
        report(false);
        done(null, chunk);
      },
    });
    // r+ with a start keeps the earlier bytes; w starts the file over.
    const out = createWriteStream(partial, { flags: written > 0 ? "r+" : "w", start: written });
    try {
      await pipeline(Readable.fromWeb(response.body as unknown as WebReadableStream), count, out, { signal });
    } finally {
      report(true);
    }
    if (size !== null ? written !== size : written <= 0) throw new DownloadError("The download stopped early", true);
  } catch (error) {
    if (idle.signal.aborted && !job.signal?.aborted) throw new DownloadError("The download stalled", true);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** GET with the redirect (Hugging Face's to its CDN, GitHub's to its storage) followed by hand: the Range has to come along. */
async function get(url: string, from: number, signal: AbortSignal): Promise<Response> {
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const headers: Record<string, string> = { "accept-encoding": "identity" };
    if (from > 0) headers.range = `bytes=${from}-`;
    const response = await fetch(url, { headers, redirect: "manual", signal });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new DownloadError(`The download redirected without a location (${response.status})`, false);
    url = new URL(location, url).toString();
  }
  throw new DownloadError("Too many redirects", false);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
