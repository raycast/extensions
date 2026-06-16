import { spawn } from "node:child_process";
import { CronJob } from "../types";

const METADATA_PREFIX = "# RaycastID:";
const METADATA_REGEX = /# RaycastID:\s*(.+?)\s*\|\s*Name:\s*(.+?)\s*\|\s*Status:\s*(.+)/;

/**
 * Result of reading the system crontab.
 * `jobs` are the Raycast-managed entries.
 * `nonManagedContent` is every other line (env vars, comments, non-Raycast cron
 * jobs) preserved verbatim so they survive round-trip writes.
 */
export interface CrontabReadResult {
  jobs: CronJob[];
  nonManagedContent: string;
}

/** Structured error thrown by readRawCrontab so callers can inspect exit code and stderr. */
class CrontabError extends Error {
  constructor(
    public readonly code: number,
    public readonly stderr: string,
  ) {
    super(`crontab -l exited with code ${code}: ${stderr}`);
    this.name = "CrontabError";
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Reads the system crontab and separates Raycast-managed entries from
 * everything else.  Non-managed content is preserved exactly as-is.
 */
export async function readCrontab(): Promise<CrontabReadResult> {
  try {
    const raw = await readRawCrontab();
    return parseCrontab(raw);
  } catch (error) {
    if (error instanceof CrontabError) {
      // crontab -l returns exit code 1 when no crontab exists for the user
      if (error.code === 1 && error.stderr.includes("no crontab")) {
        return { jobs: [], nonManagedContent: "" };
      }

      // macOS TCC / permission-denied
      if (error.stderr.includes("Operation not permitted") || error.stderr.includes("permission denied")) {
        throw new Error(
          "Permission denied when reading crontab. " +
            "Please grant Full Disk Access to Raycast in " +
            "System Settings → Privacy & Security → Full Disk Access.",
        );
      }
    }

    throw error;
  }
}

/**
 * Returns the full, raw output of `crontab -l`.
 */
function readRawCrontab(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    const child = spawn("crontab", ["-l"]);

    child.stdout.on("data", (data: Buffer) => chunks.push(data));
    child.stderr.on("data", (data: Buffer) => errChunks.push(data));

    child.on("error", (error) => reject(error));

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks).toString("utf-8"));
      } else {
        const stderr = Buffer.concat(errChunks).toString("utf-8");
        reject(new CrontabError(code ?? 1, stderr));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Writes the Raycast-managed jobs back to the system crontab while
 * preserving all non-managed content that was captured during the last read.
 *
 * @param jobs             The full list of Raycast-managed jobs.
 * @param nonManagedContent Verbatim non-Raycast lines from the last read.
 */
export async function writeCrontab(jobs: CronJob[], nonManagedContent: string): Promise<void> {
  const raycastBlock = serializeCrontab(jobs);

  // Combine: non-managed content first, then Raycast-managed block.
  // Ensure a single blank line separates the two sections.
  let fileContent: string;
  if (nonManagedContent.trim().length > 0) {
    fileContent = nonManagedContent.trimEnd() + "\n\n" + raycastBlock;
  } else {
    fileContent = raycastBlock;
  }

  return new Promise((resolve, reject) => {
    const child = spawn("crontab", ["-"]);

    child.stdin.write(fileContent);
    child.stdin.end();

    child.on("error", (error) => reject(error));

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`crontab command failed with exit code ${code}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

interface PendingMeta {
  id: string;
  name: string;
  status: string;
  lineIndex: number;
}

interface ParseContext {
  lines: string[];
  jobs: CronJob[];
  nonManagedLines: string[];
}

/** Flush orphaned metadata back into the non-managed content. */
function flushPendingMeta(ctx: ParseContext, meta: PendingMeta | null): null {
  if (meta) {
    ctx.nonManagedLines.push(ctx.lines[meta.lineIndex]);
  }
  return null;
}

/** Try to parse a Raycast metadata comment. Returns parsed metadata or null. */
function tryParseMetadata(trimmed: string, lineIndex: number): PendingMeta | null {
  const match = trimmed.match(METADATA_REGEX);
  if (!match) return null;
  return { id: match[1], name: match[2], status: match[3], lineIndex };
}

/** Build a CronJob from schedule/command parts and metadata. */
function buildJob(meta: PendingMeta, schedule: string, command: string, statusOverride?: CronJob["status"]): CronJob {
  return {
    id: meta.id,
    name: meta.name,
    schedule,
    command,
    status: statusOverride ?? (meta.status as CronJob["status"]),
    type: "custom",
    lastRun: null,
    nextRun: null,
  };
}

/** Try to split a line into schedule (5 fields) + command. */
function splitCronLine(line: string): { schedule: string; command: string } | null {
  const parts = line.split(/\s+/);
  if (parts.length < 6) return null;
  return { schedule: parts.slice(0, 5).join(" "), command: parts.slice(5).join(" ") };
}

/** Handle a Raycast metadata comment line. */
function handleMetadataLine(
  ctx: ParseContext,
  trimmed: string,
  lineIndex: number,
  pending: PendingMeta | null,
): PendingMeta | null {
  const flushed = flushPendingMeta(ctx, pending);
  const meta = tryParseMetadata(trimmed, lineIndex);
  if (meta) return meta;
  ctx.nonManagedLines.push(ctx.lines[lineIndex]);
  return flushed;
}

/** Handle a non-comment line (active cron line or env var / short line). */
function handleActiveLine(
  ctx: ParseContext,
  line: string,
  trimmed: string,
  pending: PendingMeta | null,
): PendingMeta | null {
  const parsed = splitCronLine(trimmed);
  if (parsed && pending) {
    ctx.jobs.push(buildJob(pending, parsed.schedule, parsed.command));
    return null;
  }
  const flushed = flushPendingMeta(ctx, pending);
  ctx.nonManagedLines.push(line);
  return flushed;
}

/** Handle a comment line that may represent a paused Raycast job. */
function handleCommentLine(
  ctx: ParseContext,
  line: string,
  trimmed: string,
  pending: PendingMeta | null,
): PendingMeta | null {
  if (pending?.status === "paused") {
    const parsed = splitCronLine(trimmed.substring(1).trim());
    if (parsed) {
      ctx.jobs.push(buildJob(pending, parsed.schedule, parsed.command, "paused"));
      return null;
    }
  }
  const flushed = flushPendingMeta(ctx, pending);
  ctx.nonManagedLines.push(line);
  return flushed;
}

/**
 * Separates a raw crontab string into Raycast-managed jobs and non-managed
 * content.  A Raycast-managed block is a metadata comment immediately
 * followed by its cron line (or commented-out cron line if paused).
 */
function parseCrontab(content: string): CrontabReadResult {
  const ctx: ParseContext = {
    lines: content.split("\n"),
    jobs: [],
    nonManagedLines: [],
  };
  let pending: PendingMeta | null = null;

  for (let i = 0; i < ctx.lines.length; i++) {
    const line = ctx.lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      pending = flushPendingMeta(ctx, pending);
      ctx.nonManagedLines.push(line);
    } else if (trimmed.startsWith(METADATA_PREFIX)) {
      pending = handleMetadataLine(ctx, trimmed, i, pending);
    } else if (!trimmed.startsWith("#")) {
      pending = handleActiveLine(ctx, line, trimmed, pending);
    } else {
      pending = handleCommentLine(ctx, line, trimmed, pending);
    }
  }

  flushPendingMeta(ctx, pending);

  return {
    jobs: ctx.jobs,
    nonManagedContent: ctx.nonManagedLines.join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

function serializeCrontab(jobs: CronJob[]): string {
  if (jobs.length === 0) return "";

  return (
    jobs
      .map((job) => {
        const metadata = `${METADATA_PREFIX} ${job.id} | Name: ${job.name} | Status: ${job.status}`;
        let line = `${job.schedule} ${job.command}`;

        if (job.status === "paused") {
          line = `# ${line}`;
        }

        return `${metadata}\n${line}`;
      })
      .join("\n\n") + "\n"
  );
}
