import { exec } from "child_process";
import { promisify } from "util";
import cronParser from "cron-parser";
import { jobKey, saveRunLog, RunLog } from "./log-store";

const execAsync = promisify(exec);

export interface CronJob {
  type: "job" | "env";
  schedule: string; // e.g. "*/5 * * * *"
  command: string; // the shell command
  comment?: string; // label from inline # comment
  disabled: boolean; // line starts with #
  raw: string; // the original crontab line
  lineIndex: number; // position in crontab
}

// ──────────────────────────────────────────────────────────────────────────────
// Parsing
// ──────────────────────────────────────────────────────────────────────────────

export async function loadCronJobs(): Promise<CronJob[]> {
  let raw: string;
  try {
    const { stdout } = await execAsync("crontab -l 2>/dev/null || true");
    raw = stdout;
  } catch {
    raw = "";
  }

  const lines = raw.split("\n");
  const jobs: CronJob[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Blank lines — skip
    if (!trimmed) return;

    // Disabled job line: starts with #
    const isDisabled = trimmed.startsWith("#");
    const effectiveLine = isDisabled ? trimmed.replace(/^#\s*/, "") : trimmed;

    // Environment variable line (KEY=VALUE, not a schedule)
    if (/^[A-Z_][A-Z0-9_]*\s*=/.test(effectiveLine) && !isDisabled) {
      jobs.push({
        type: "env",
        schedule: "",
        command: "",
        disabled: false,
        raw: line,
        lineIndex: idx,
      });
      return;
    }

    // Try to match a cron schedule
    const m = effectiveLine.match(
      /^((?:@\w+)|(?:\S+\s+\S+\s+\S+\s+\S+\s+\S+))\s+(.+?)(?:\s+#\s*(.+))?$/,
    );

    if (!m) {
      // Pure comment line
      if (isDisabled) return;
      return;
    }

    const [, schedule, command, comment] = m;

    // Validate it's a real cron schedule
    if (!isValidCron(schedule)) return;

    jobs.push({
      type: "job",
      schedule: schedule.trim(),
      command: command.trim(),
      comment: comment?.trim(),
      disabled: isDisabled,
      raw: line,
      lineIndex: idx,
    });
  });

  return jobs;
}

// ──────────────────────────────────────────────────────────────────────────────
// Writing
// ──────────────────────────────────────────────────────────────────────────────

async function getRawCrontab(): Promise<string[]> {
  try {
    const { stdout } = await execAsync("crontab -l 2>/dev/null || true");
    return stdout.split("\n");
  } catch {
    return [];
  }
}

async function writeCrontab(lines: string[]): Promise<void> {
  // Remove trailing empty lines then add a newline at end
  const content = lines.join("\n").trimEnd() + "\n";
  const escaped = content.replace(/'/g, "'\\''");
  await execAsync(`printf '%s' '${escaped}' | crontab -`);
}

export async function addCronJob(
  job: Omit<CronJob, "raw" | "lineIndex" | "type" | "disabled">,
): Promise<void> {
  const lines = await getRawCrontab();
  const newLine = buildLine(job);
  lines.push(newLine);
  await writeCrontab(lines);
}

export async function editCronJob(
  original: CronJob,
  updated: Omit<CronJob, "raw" | "lineIndex" | "type" | "disabled">,
): Promise<void> {
  const lines = await getRawCrontab();
  if (lines[original.lineIndex] !== original.raw) {
    throw new Error(
      "Crontab was modified externally — please refresh and try again",
    );
  }
  const newLine = buildLine(updated);
  lines[original.lineIndex] = newLine;
  await writeCrontab(lines);
}

export async function deleteCronJob(job: CronJob): Promise<void> {
  const lines = await getRawCrontab();
  if (lines[job.lineIndex] !== job.raw) {
    throw new Error(
      "Crontab was modified externally — please refresh and try again",
    );
  }
  lines.splice(job.lineIndex, 1);
  await writeCrontab(lines);
}

function buildLine(job: {
  schedule: string;
  command: string;
  comment?: string;
}): string {
  let line = `${job.schedule} ${job.command}`;
  if (job.comment) line += ` # ${job.comment}`;
  return line;
}

// ──────────────────────────────────────────────────────────────────────────────
// Next-run calculation
// ──────────────────────────────────────────────────────────────────────────────

export function getNextRunTimes(schedule: string, count: number): Date[] {
  try {
    const interval = cronParser.parseExpression(schedule, { utc: false });
    const results: Date[] = [];
    for (let i = 0; i < count; i++) {
      results.push(interval.next().toDate());
    }
    return results;
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Manual run — executes command, captures output, saves log
// ──────────────────────────────────────────────────────────────────────────────

export interface RunResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export async function runCronJob(job: CronJob): Promise<RunResult> {
  const key = jobKey(job.schedule, job.command);
  const startedAt = Date.now();

  // Run via /bin/sh to replicate cron's execution environment.
  // We load a minimal PATH so that common tools work.
  const shellCmd = `export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"; ${job.command}`;

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const result = await execAsync(shellCmd, {
      shell: "/bin/sh",
      timeout: 5 * 60 * 1000, // 5 minute hard timeout
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: unknown) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      code?: number;
      signal?: string;
    };
    stdout = e.stdout ?? "";
    stderr = e.stderr ?? (err instanceof Error ? err.message : String(err));
    exitCode = typeof e.code === "number" ? e.code : 1;
  }

  const finishedAt = Date.now();
  const durationMs = finishedAt - startedAt;
  const success = exitCode === 0;

  const log: RunLog = {
    id: `${startedAt}-${Math.random().toString(36).slice(2, 7)}`,
    jobKey: key,
    startedAt,
    finishedAt,
    durationMs,
    exitCode,
    stdout,
    stderr,
    success,
    triggeredBy: "manual",
  };

  await saveRunLog(log);

  return { success, exitCode, stdout, stderr, durationMs };
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────────────────────────────────────────

export function isValidCron(expr: string): boolean {
  if (expr.startsWith("@")) {
    return [
      "@reboot",
      "@yearly",
      "@annually",
      "@monthly",
      "@weekly",
      "@daily",
      "@midnight",
      "@hourly",
    ].includes(expr);
  }
  try {
    cronParser.parseExpression(expr);
    return true;
  } catch {
    return false;
  }
}

export function validateCronField(expr: string): string | undefined {
  if (!expr.trim()) return "Schedule is required";
  if (!isValidCron(expr.trim())) return "Invalid cron expression";
  return undefined;
}
