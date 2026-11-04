import { execFile, spawn } from "node:child_process";

export interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

/** Run a program without a shell. Never throws. */
export function run(file: string, args: string[], input?: string, timeoutMs = 5000): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = execFile(file, args, { encoding: "utf8", timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout ?? ""), stderr: String(stderr ?? (err ? String(err) : "")) });
    });
    if (input !== undefined) {
      child.stdin?.on("error", () => undefined);
      child.stdin?.end(input);
    }
  });
}

/** Fire and forget (used for notifications and chained notify commands so hooks return fast). */
export function detach(file: string, args: string[]): void {
  try {
    const child = spawn(file, args, { detached: true, stdio: "ignore" });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    // ignore
  }
}

export function osascript(script: string, lang: "AppleScript" | "JavaScript" = "AppleScript"): Promise<ExecResult> {
  return run("/usr/bin/osascript", ["-l", lang, "-e", script]);
}

/** Quote a string for AppleScript string literals. */
export function asString(s: string): string {
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/** Quote a string for POSIX shells. */
export function shQuote(s: string): string {
  if (/^[A-Za-z0-9_\-./:=@%+]+$/.test(s)) return s;
  return "'" + s.replace(/'/g, "'\\''") + "'";
}
