import { execFile, spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { promisify } from "node:util";
import path from "node:path";
import { isNoisyPath, isSystemPath } from "./read-dir";
import { matchTier } from "./query";
import { LIVE_CANDIDATES, SPOTLIGHT_RAW_PATHS } from "./search-limits";

const exec = promisify(execFile);

/** Small chunks allow partial metadata results before the deadline. */
const CHUNK = 25;
/** mdls emits attributes alphabetically, so positional parsing uses this order. */
const ATTRS = ["kMDItemLastUsedDate", "kMDItemUseCount"].sort();
const IDX_LAST_USED = ATTRS.indexOf("kMDItemLastUsedDate");
const IDX_USE_COUNT = ATTRS.indexOf("kMDItemUseCount");
const NULL_MARKER = "NULL";
/** Record separator used by mdls -raw and mdfind -0. */
const SEP = String.fromCharCode(0);

export type UsageMeta = { useCount?: number; lastUsedMs?: number };
export type UsageMetaResult = {
  meta: Map<string, UsageMeta>;
  complete: boolean;
  partial?: string;
  error?: string;
  cancelled?: boolean;
};
export type SearchPathResult = {
  paths: string[];
  truncated: boolean;
  error?: string;
  cancelled?: boolean;
};
type SearchOptions = {
  scope?: string;
  showHidden?: boolean;
  max?: number;
  /** Supplement literal results with fuzzy alphanumeric filename matches. */
  fuzzy?: boolean;
  signal?: AbortSignal;
  /** Receives batches instead of retaining all paths in the returned result. */
  onBatch?: (paths: string[]) => void | Promise<void>;
};
type SpotlightRunner = (
  args: string[],
  signal?: AbortSignal,
) => Promise<string> | AsyncIterable<string | Buffer>;
type MetadataRunner = (
  args: string[],
  timeoutMs: number,
  signal?: AbortSignal,
) => Promise<string>;

function isTimeout(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "ETIMEDOUT") return true;
  return (
    "killed" in error &&
    error.killed === true &&
    "signal" in error &&
    error.signal === "SIGKILL"
  );
}

/** Parses the fixed date format emitted by mdls. */
function parseMdlsDate(value: string): number | undefined {
  const m =
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/.exec(
      value.trim(),
    );
  if (!m) return undefined;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7]}${m[8]}:${m[9]}`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : t;
}

/** Batch-reads positional, NUL-separated Spotlight usage metadata with status. */
export async function readUsageMetaResult(
  paths: string[],
  /** Deadline for optional metadata enrichment. */
  opts: {
    timeoutMs?: number;
    signal?: AbortSignal;
    continuous?: boolean;
    onProgress?: (meta: Map<string, UsageMeta>) => void;
  } = {},
  runner: MetadataRunner = async (args, timeoutMs, signal) => {
    const { stdout } = await exec("mdls", args, {
      maxBuffer: 1 << 24,
      timeout: timeoutMs,
      killSignal: "SIGKILL",
      signal,
    });
    return stdout;
  },
): Promise<UsageMetaResult> {
  const { timeoutMs = opts.continuous ? 5000 : 250 } = opts;
  let deadline = Date.now() + timeoutMs;
  const out = new Map<string, UsageMeta>();
  let hadProcessFailure = false;
  let hadSuccessfulBatch = false;
  let hadTimeout = false;
  let hadInvalidBatch = false;

  const mergeChunk = (chunk: string[], stdout: string): boolean => {
    const values = stdout.split(SEP);
    // Reject malformed output rather than misaligning metadata and paths.
    if (values.length < chunk.length * ATTRS.length) return false;

    hadSuccessfulBatch = true;
    chunk.forEach((p, idx) => {
      const base = idx * ATTRS.length;
      const useCountRaw = values[base + IDX_USE_COUNT];
      const lastUsedRaw = values[base + IDX_LAST_USED];
      const meta: UsageMeta = {};
      if (useCountRaw && useCountRaw !== NULL_MARKER) {
        // Reject non-numeric values instead of accepting a partial parse.
        const trimmed = useCountRaw.trim();
        if (/^\d+$/.test(trimmed)) meta.useCount = Number.parseInt(trimmed, 10);
      }
      if (lastUsedRaw && lastUsedRaw !== NULL_MARKER) {
        meta.lastUsedMs = parseMdlsDate(lastUsedRaw);
      }
      if (meta.useCount !== undefined || meta.lastUsedMs !== undefined)
        out.set(p, meta);
    });
    return true;
  };

  const readChunk = async (
    chunk: string[],
  ): Promise<"done" | "timeout" | "invalid" | "cancelled"> => {
    if (opts.signal?.aborted) return "cancelled";
    const remaining = deadline - Date.now();
    if (remaining <= 0) return "timeout";

    let stdout: string;
    try {
      const args = ["-raw", "-nullMarker", NULL_MARKER];
      for (const a of ATTRS) args.push("-name", a);
      stdout = await runner([...args, ...chunk], remaining, opts.signal);
    } catch (error) {
      if (opts.signal?.aborted) return "cancelled";
      if (isTimeout(error)) return "timeout";
      hadProcessFailure = true;
      if (chunk.length === 1) return "done";

      // Isolate a bad path while retaining metadata from the rest of the batch.
      const middle = Math.ceil(chunk.length / 2);
      const left = await readChunk(chunk.slice(0, middle));
      if (left !== "done") return left;
      return readChunk(chunk.slice(middle));
    }

    if (opts.signal?.aborted) return "cancelled";
    return mergeChunk(chunk, stdout) ? "done" : "invalid";
  };

  for (let i = 0; i < paths.length; i += CHUNK) {
    if (opts.continuous) deadline = Date.now() + timeoutMs;
    const result = await readChunk(paths.slice(i, i + CHUNK));
    if (result === "cancelled")
      return { meta: out, complete: false, cancelled: true };
    if (opts.continuous) {
      hadTimeout ||= result === "timeout";
      hadInvalidBatch ||= result === "invalid";
      opts.onProgress?.(new Map(out));
      continue;
    }
    if (result === "timeout") {
      if (hadProcessFailure && !hadSuccessfulBatch) {
        return {
          meta: out,
          complete: false,
          error: "Spotlight usage metadata failed",
        };
      }
      return {
        meta: out,
        complete: false,
        partial: hadProcessFailure
          ? "usage metadata unavailable for some items"
          : "usage metadata stopped at the time limit",
      };
    }
    if (result === "invalid") {
      return {
        meta: out,
        complete: false,
        error: "Spotlight returned invalid usage metadata",
      };
    }
  }

  if (hadInvalidBatch && !hadSuccessfulBatch)
    return {
      meta: out,
      complete: false,
      error: "Spotlight returned invalid usage metadata",
    };
  if (hadProcessFailure) {
    return hadSuccessfulBatch
      ? {
          meta: out,
          complete: false,
          partial: "usage metadata unavailable for some items",
        }
      : {
          meta: out,
          complete: false,
          error: "Spotlight usage metadata failed",
        };
  }
  if (hadTimeout || hadInvalidBatch)
    return {
      meta: out,
      complete: false,
      partial: "Usage metadata unavailable for some items",
    };

  return { meta: out, complete: true };
}

export async function readUsageMeta(
  paths: string[],
  opts: { timeoutMs?: number } = {},
): Promise<Map<string, UsageMeta>> {
  return (await readUsageMetaResult(paths, opts)).meta;
}

/** Removes noisy paths and applies the caller's optional collection limit. */
export function collectSearchPaths(
  candidates: Iterable<string>,
  opts: SearchOptions = {},
): SearchPathResult {
  const { scope, showHidden = false, max = 4000 } = opts;
  const root = scope ?? path.sep;
  const paths: string[] = [];

  for (const candidate of candidates) {
    if (candidate === "" || candidate === root) continue;
    if (!scope && isSystemPath(candidate)) continue;
    if (isNoisyPath(candidate, root, showHidden)) continue;
    if (paths.length >= max) return { paths, truncated: true };
    paths.push(candidate);
  }

  return { paths, truncated: false };
}

export async function runSpotlightSearch(
  query: string,
  opts: SearchOptions = {},
  runner: SpotlightRunner,
): Promise<SearchPathResult> {
  const { scope } = opts;
  const cancelled: SearchPathResult = {
    paths: [],
    truncated: false,
    cancelled: true,
  };
  if (opts.signal?.aborted) return cancelled;
  if (query.trim() === "") return { paths: [], truncated: false };

  const args = ["-0"];
  if (scope) args.push("-onlyin", scope);
  const passes = [["-name", query]];
  if (opts.fuzzy && /^[\p{L}\p{N}]+$/u.test(query)) {
    // Spotlight does not support the matcher's arbitrary gaps within a name.
    const predicate = [...new Set(query.toLowerCase())]
      .map((character) => `kMDItemFSName == "*${character}*"cd`)
      .join(" && ");
    passes.push([predicate]);
  }

  const paths: string[] = [];
  const seen = new Set<string>();
  let count = 0;
  let rawCount = 0;
  const max = Math.min(opts.max ?? 4000, LIVE_CANDIDATES);
  let truncated = false;
  const emit = async (batch: string[], fuzzy: boolean) => {
    if (opts.signal?.aborted || batch.length === 0) return;
    const remaining = Math.max(0, SPOTLIGHT_RAW_PATHS - rawCount);
    if (batch.length > remaining) truncated = true;
    rawCount += Math.min(batch.length, remaining);
    const accepted = collectSearchPaths(batch.slice(0, remaining), {
      ...opts,
      max: Infinity,
    }).paths;
    const filtered: string[] = [];
    for (const full of accepted) {
      if (seen.has(full)) continue;
      if (fuzzy && matchTier(query, path.basename(full)) === undefined)
        continue;
      if (count >= max) {
        truncated = true;
        break;
      }
      if (passes.length > 1) seen.add(full);
      count++;
      filtered.push(full);
    }
    if (opts.onBatch) await opts.onBatch(filtered);
    else paths.push(...filtered);
  };
  try {
    for (const [pass, terms] of passes.entries()) {
      if (opts.signal?.aborted) return cancelled;
      const output = await runner([...args, ...terms], opts.signal);
      const chunks = typeof output === "string" ? [output] : output;
      const decoder = new StringDecoder("utf8");
      let pending = "";
      for await (const chunk of chunks) {
        if (opts.signal?.aborted) return cancelled;
        pending += typeof chunk === "string" ? chunk : decoder.write(chunk);
        let start = 0;
        let batch: string[] = [];
        for (
          let end = pending.indexOf(SEP);
          end >= 0;
          end = pending.indexOf(SEP, start)
        ) {
          batch.push(pending.slice(start, end));
          start = end + 1;
          if (batch.length === 60) {
            await emit(batch, pass > 0);
            batch = [];
            if (opts.signal?.aborted) return cancelled;
            if (truncated) return { paths, truncated };
          }
        }
        pending = pending.slice(start);
        await emit(batch, pass > 0);
        if (truncated) return { paths, truncated };
        // A path cannot legitimately consume an unbounded output buffer.
        if (pending.length > 1 << 20) throw new Error("Invalid Spotlight path");
      }
      pending += decoder.end();
      if (pending) await emit([pending], pass > 0);
      if (truncated) return { paths, truncated };
    }
    return opts.signal?.aborted ? cancelled : { paths, truncated };
  } catch {
    if (opts.signal?.aborted) return cancelled;
    return {
      paths,
      truncated,
      error: "Spotlight search failed",
    };
  }
}

export async function searchPathResult(
  query: string,
  opts: SearchOptions = {},
): Promise<SearchPathResult> {
  return runSpotlightSearch(query, opts, (args, signal) =>
    spotlightOutput(args, signal),
  );
}

/** Reading stdout on demand supplies backpressure; cancellation kills mdfind. */
async function* spotlightOutput(args: string[], signal?: AbortSignal) {
  if (signal?.aborted) return;
  const child = spawn("mdfind", args, { stdio: ["ignore", "pipe", "ignore"] });
  const finished = new Promise<boolean>((resolve) => {
    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
  const stop = () => {
    child.kill("SIGKILL");
  };
  signal?.addEventListener("abort", stop, { once: true });
  try {
    if (signal?.aborted) stop();
    for await (const chunk of child.stdout) {
      if (signal?.aborted) return;
      yield chunk as Buffer;
    }
    if (!(await finished) && !signal?.aborted)
      throw new Error("Spotlight failed");
  } finally {
    signal?.removeEventListener("abort", stop);
    if (child.exitCode === null && child.signalCode === null) stop();
    await finished;
  }
}

export async function searchPaths(
  query: string,
  opts: SearchOptions = {},
): Promise<string[]> {
  return (await searchPathResult(query, opts)).paths;
}
