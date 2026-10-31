import { environment, getPreferenceValues } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, rename, stat } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

/**
 * Developer-only local observability. No work (and no disk writes) is done
 * during regular searches with tracing turned off.
 *
 * Privacy: deliberately never record filenames, search queries, real binary
 * paths, configured roots, exclusion patterns or stderr messages.
 */
export type CommandTraceTool = "fd" | "fzf";
export type CommandTraceOutcome =
  "success" | "limit-reached" | "failure" | "cancelled";
export type CommandTraceRecord = {
  id: string;
  at: string;
  tool: CommandTraceTool;
  phase: "start" | "end";
  reason: "manual-rebuild" | "fuzzy-query";
  invocation: string;
  outcome?: CommandTraceOutcome;
  durationMs?: number;
  resultCount?: number;
  exitCode?: number | null;
  errorCode?: string;
};

const TRACE_FILE = path.join(environment.supportPath, "command-trace.jsonl");
const PREVIOUS_FILE = path.join(
  environment.supportPath,
  "command-trace.previous.jsonl",
);
const MAX_LOG_BYTES = 256 * 1024;
const MAX_VIEW_EVENTS = 50;

export function commandTracingEnabled(): boolean {
  return getPreferenceValues<Preferences>().enableCommandTracing === true;
}

function sanitizedCode(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === "string" && /^[A-Z0-9_-]{1,32}$/.test(code)
    ? code
    : "UNKNOWN";
}

async function writeRecord(record: CommandTraceRecord): Promise<void> {
  try {
    await mkdir(environment.supportPath, { recursive: true });
    // Best-effort bounded rotation; concurrent writers may leave unpaired
    // events but must never affect search or index correctness.
    try {
      const info = await stat(TRACE_FILE);
      if (info.size >= MAX_LOG_BYTES) await rename(TRACE_FILE, PREVIOUS_FILE);
    } catch {
      // First write or concurrent rotation.
    }
    await appendFile(TRACE_FILE, JSON.stringify(record) + "\n", "utf8");
  } catch (error) {
    console.warn("PathSeek trace write failed:", sanitizedCode(error));
  }
}

export async function beginCommandTrace(
  tool: CommandTraceTool,
  reason: CommandTraceRecord["reason"],
  invocation: string,
): Promise<{
  finish(
    outcome: CommandTraceOutcome,
    resultCount?: number,
    exitCode?: number | null,
    error?: unknown,
  ): Promise<void>;
} | null> {
  if (!commandTracingEnabled()) return null;
  const id = randomUUID();
  const start = performance.now();
  await writeRecord({
    id,
    at: new Date().toISOString(),
    tool,
    reason,
    invocation,
    phase: "start",
  });
  return {
    async finish(outcome, resultCount, exitCode, error) {
      await writeRecord({
        id,
        at: new Date().toISOString(),
        tool,
        reason,
        invocation,
        phase: "end",
        outcome,
        durationMs: Math.round(performance.now() - start),
        ...(resultCount === undefined ? {} : { resultCount }),
        ...(exitCode === undefined ? {} : { exitCode }),
        ...(error === undefined ? {} : { errorCode: sanitizedCode(error) }),
      });
    },
  };
}

/** Reconstruct a copy-safe summary from bounded, on-disk trace records. */
export async function readCommandTrace(): Promise<CommandTraceRecord[]> {
  if (!commandTracingEnabled()) return [];
  const records: CommandTraceRecord[] = [];
  for (const file of [PREVIOUS_FILE, TRACE_FILE]) {
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as CommandTraceRecord;
        if (
          (entry.tool === "fd" || entry.tool === "fzf") &&
          (entry.phase === "start" || entry.phase === "end") &&
          typeof entry.at === "string" &&
          typeof entry.id === "string"
        ) {
          records.push(entry);
        }
      } catch {
        // Tolerate incomplete concurrent writes and torn final lines.
      }
    }
  }
  return records.slice(-MAX_VIEW_EVENTS);
}

export function summarizeCommandTrace(records: CommandTraceRecord[]): string {
  if (!records.length)
    return "No fd/fzf calls recorded in this tracing session.";
  const tick = String.fromCharCode(96);
  const output = records.map((event) => {
    const detail =
      event.phase === "start"
        ? "started"
        : [
            event.outcome ?? "finished",
            event.durationMs === undefined ? "" : event.durationMs + "ms",
            event.resultCount === undefined
              ? ""
              : "results=" + event.resultCount,
            event.exitCode === undefined
              ? ""
              : "exit=" + String(event.exitCode),
            event.errorCode ? "error=" + event.errorCode : "",
          ]
            .filter(Boolean)
            .join(", ");
    return (
      "- " +
      event.at +
      " | " +
      tick +
      event.tool +
      tick +
      " | " +
      event.reason +
      " | " +
      event.invocation +
      " | " +
      detail
    );
  });
  return output.reverse().join("\n");
}
