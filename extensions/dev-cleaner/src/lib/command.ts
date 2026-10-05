import { spawn } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { CommandSpec } from "../types";

const MAX_OUTPUT_BYTES = 64 * 1024;

function appendBounded(current: string, chunk: Buffer | string): string {
  const next = current + chunk.toString();
  return next.length <= MAX_OUTPUT_BYTES ? next : next.slice(-MAX_OUTPUT_BYTES);
}

function abortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  const error = new Error("Operation cancelled");
  error.name = "AbortError";
  return error;
}

async function isExecutable(candidate: string): Promise<boolean> {
  try {
    await access(candidate, 1);
    return true;
  } catch {
    return false;
  }
}

async function fnmBinDirectories(homeDirectory: string): Promise<string[]> {
  const versionsRoot = path.join(homeDirectory, ".local/share/fnm/node-versions");
  try {
    const entries = await readdir(versionsRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(versionsRoot, entry.name, "installation/bin"))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function resolveExecutable(
  name: string,
  options: { homeDirectory?: string; extraPath?: string } = {},
): Promise<string | undefined> {
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const pathParts = [
    ...(options.extraPath?.split(path.delimiter) ?? []),
    ...(process.env.PATH?.split(path.delimiter) ?? []),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    path.join(homeDirectory, ".local/bin"),
    path.join(homeDirectory, ".local/share/fnm/aliases/default/bin"),
    ...(await fnmBinDirectories(homeDirectory)),
  ];

  for (const directory of new Set(pathParts.filter(Boolean))) {
    const candidate = path.join(directory, name);
    if (await isExecutable(candidate)) return candidate;
  }
  return undefined;
}

export async function runCommand(
  spec: CommandSpec,
  signal?: AbortSignal,
  extraPath?: string,
): Promise<{ stdout: string; stderr: string }> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const effectivePath = [extraPath, process.env.PATH].filter(Boolean).join(path.delimiter);
    // A detached child leads its own process group, so cancellation can also stop the processes it starts.
    const child = spawn(spec.executable, spec.args, {
      detached: true,
      env: { ...process.env, PATH: effectivePath, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let stopReason: Error | undefined;
    const stopTimers: NodeJS.Timeout[] = [];
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      stopTimers.forEach(clearTimeout);
      signal?.removeEventListener("abort", onAbort);
      callback();
    };
    const signalGroup = (name: NodeJS.Signals) => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, name);
      } catch {
        child.kill(name);
      }
    };
    // Reports the stop only after the process group has exited, so a new cleanup cannot overlap a cancelled one.
    // The last timer settles anyway if a descendant escaped the group and keeps the output pipes open.
    const terminate = (reason: Error) => {
      if (stopReason) return;
      stopReason = reason;
      clearTimeout(timeout);
      signalGroup("SIGTERM");
      stopTimers.push(
        setTimeout(() => signalGroup("SIGKILL"), 1_000),
        setTimeout(() => finish(() => reject(reason)), 3_000),
      );
    };
    const onAbort = () => terminate(abortError(signal?.reason));
    const timeout = setTimeout(
      () => terminate(new Error(`Command timed out after ${spec.timeoutMs ?? 120_000}ms`)),
      spec.timeoutMs ?? 120_000,
    );
    timeout.unref();
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendBounded(stderr, chunk);
    });
    child.once("error", (error) => finish(() => reject(error)));
    child.once("close", (code, childSignal) => {
      finish(() => {
        if (stopReason) reject(stopReason);
        else if (code === 0) resolve({ stdout, stderr });
        else reject(new Error((stderr || stdout).trim() || `Command exited with ${code ?? childSignal ?? "unknown"}`));
      });
    });
  });
}
