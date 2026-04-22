import fs from "node:fs";

export const STATE_FILE = "/tmp/ex-release-current-run.json";
export const LIVE_LOG_FILE = "/tmp/ex-release-live.log";

export interface RunState {
  pid: number | null;
  startedAt: string;
  finishedAt: string | null;
  stage: string;
  args: string[];
  ts: string | null;
  logPath: string;
  status: "running" | "done" | "failed";
  exitCode: number | null;
  signal: string | null;
  notes: string;
}

export function writeRunState(state: RunState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // ignore
  }
}

export function readRunState(): RunState | null {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw) as RunState;
  } catch {
    return null;
  }
}

export function readLiveLog(): string {
  try {
    return fs.readFileSync(LIVE_LOG_FILE, "utf8");
  } catch {
    return "";
  }
}

// kill -0 只检查进程是否存活，不发信号
export function isProcessAlive(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
