import { execFile } from "node:child_process";
import { promisify } from "node:util";

/**
 * Spotlight usage metadata.
 *
 * The only Spotlight call left in the extension. It reads `kMDItemUseCount` and
 * `kMDItemLastUsedDate` for the entries of the folder being browsed, which the
 * index cannot supply: those change every time the user opens a file, while the
 * index records only what fd saw during the last scan.
 *
 * Every read is bounded by a deadline and reports whether it finished, so a
 * slow or unavailable Spotlight degrades the ranking instead of blocking it.
 */

const exec = promisify(execFile);

/*
 * Batches exist to bound one failure, and they run several at a time.
 *
 * One mdls process costs about 85 ms whatever it is given, so a serial pass is
 * priced by its batch count: 253 entries took 903 ms. Larger batches are worse
 * rather than better, because a batch containing a path mdls cannot read is
 * isolated by halving, and a home folder of cloud-service symlinks pays that on
 * every visit. Four at a time, halving both sides together, brings 253 entries
 * to 267 ms and that home folder from 767 ms to 262 ms, reading the same
 * metadata in both cases. Eight at a time is no faster.
 */
const CHUNK = 25;
const CONCURRENCY = 4;
/** mdls emits attributes alphabetically, so positional parsing uses this order. */
const ATTRS = ["kMDItemLastUsedDate", "kMDItemUseCount"].sort();
const IDX_LAST_USED = ATTRS.indexOf("kMDItemLastUsedDate");
const IDX_USE_COUNT = ATTRS.indexOf("kMDItemUseCount");
const NULL_MARKER = "NULL";
/** Record separator used by mdls -raw. */
const SEP = String.fromCharCode(0);

export type UsageMeta = { useCount?: number; lastUsedMs?: number };
export type UsageMetaResult = {
  meta: Map<string, UsageMeta>;
  complete: boolean;
  partial?: string;
  error?: string;
  cancelled?: boolean;
};
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
  const { timeoutMs = 250 } = opts;
  const deadline = Date.now() + timeoutMs;
  const out = new Map<string, UsageMeta>();
  let hadProcessFailure = false;
  let hadSuccessfulBatch = false;

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

      /*
       * Isolate a bad path while retaining metadata from the rest of the batch.
       * Both halves are read together: descending one path at a time was most
       * of what a folder holding an unreadable path cost, and reading the far
       * half anyway keeps metadata that stopping early used to discard.
       */
      const middle = Math.ceil(chunk.length / 2);
      const [left, right] = await Promise.all([
        readChunk(chunk.slice(0, middle)),
        readChunk(chunk.slice(middle)),
      ]);
      return left !== "done" ? left : right;
    }

    if (opts.signal?.aborted) return "cancelled";
    return mergeChunk(chunk, stdout) ? "done" : "invalid";
  };

  const batches: string[][] = [];
  for (let i = 0; i < paths.length; i += CHUNK)
    batches.push(paths.slice(i, i + CHUNK));

  /*
   * Batches run several at a time, and the first one that does not finish
   * cleanly stops the rest. Workers share `next`, `out` and the status flags,
   * which is safe because each only touches them between awaits.
   */
  let stopped: "timeout" | "invalid" | "cancelled" | undefined;
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < batches.length && !stopped; i = next++) {
      const result = await readChunk(batches[i]);
      if (result !== "done") {
        stopped ??= result;
        return;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker),
  );

  if (stopped === "cancelled")
    return { meta: out, complete: false, cancelled: true };
  if (stopped === "invalid")
    return {
      meta: out,
      complete: false,
      error: "Spotlight returned invalid usage metadata",
    };
  // A process failure outranks the deadline: both stop short, but only this
  // one says which items are missing, and neither says it twice.
  if (hadProcessFailure)
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
  if (stopped === "timeout")
    return {
      meta: out,
      complete: false,
      partial: "usage metadata stopped at the time limit",
    };
  return { meta: out, complete: true };
}
