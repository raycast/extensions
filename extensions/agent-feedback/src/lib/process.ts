import { execFile, spawn, spawnSync } from "child_process";
import { closeSync, openSync } from "fs";

export function runFile(
  file: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${file} failed: ${stderr || error.message}`));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

export function spawnDetached(
  file: string,
  args: string[],
  logPath?: string,
): number {
  const logDescriptor = logPath ? openSync(logPath, "a") : undefined;
  const child = spawn(file, args, {
    detached: true,
    stdio:
      logDescriptor === undefined
        ? "ignore"
        : ["ignore", logDescriptor, logDescriptor],
  });
  child.unref();
  if (logDescriptor !== undefined) closeSync(logDescriptor);
  if (!child.pid) throw new Error(`Could not start ${file}`);
  return child.pid;
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    const result = spawnSync("/bin/ps", ["-p", String(pid), "-o", "stat="], {
      encoding: "utf8",
    });
    const status = result.stdout.trim();
    return result.status === 0 && status.length > 0 && !status.startsWith("Z");
  } catch {
    return false;
  }
}

export async function waitForProcessExit(
  pid: number,
  timeoutMs = 12_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessRunning(pid)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("The screen recorder did not stop cleanly");
}
