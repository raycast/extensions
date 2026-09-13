import { execFile, spawn, spawnSync } from "child_process";
import { closeSync, openSync } from "fs";
import type { ProcessIdentity } from "./types";

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

export async function spawnDetached(
  file: string,
  args: string[],
  logPath?: string,
): Promise<ProcessIdentity> {
  const logDescriptor = logPath ? openSync(logPath, "a") : undefined;
  const child = spawn(file, args, {
    detached: true,
    stdio:
      logDescriptor === undefined
        ? "ignore"
        : ["ignore", logDescriptor, logDescriptor],
  });
  if (logDescriptor !== undefined) closeSync(logDescriptor);
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  child.unref();
  if (!child.pid) throw new Error(`Could not start ${file}`);
  const identity = readProcessIdentity(child.pid, file);
  if (!identity) {
    child.kill("SIGTERM");
    throw new Error(`Could not verify ${file} after starting it`);
  }
  return identity;
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

export function readProcessIdentity(
  pid: number,
  expectedExecutable?: string,
): ProcessIdentity | undefined {
  if (!isProcessRunning(pid)) return undefined;
  const result = spawnSync(
    "/bin/ps",
    ["-p", String(pid), "-o", "lstart=", "-o", "comm="],
    { encoding: "utf8" },
  );
  const output = result.stdout.trim();
  if (result.status !== 0 || output.length <= 24) return undefined;
  const startedAt = output.slice(0, 24);
  const executable = output.slice(24).trim();
  if (!executable || (expectedExecutable && executable !== expectedExecutable))
    return undefined;
  return { pid, executable, startedAt };
}

export function isSameProcess(identity: ProcessIdentity): boolean {
  const current = readProcessIdentity(identity.pid, identity.executable);
  return current?.startedAt === identity.startedAt;
}

export async function waitForProcessExit(
  identity: ProcessIdentity,
  timeoutMs = 12_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isSameProcess(identity)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("The screen recorder did not stop cleanly");
}
