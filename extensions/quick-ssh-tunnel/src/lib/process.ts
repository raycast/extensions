import { execFileSync, spawn } from "child_process";
import fs from "fs";
import { buildArgs } from "./core";
import { readState, writeState } from "./store";
import type { Connection } from "./store";

export type Status = "running" | "stopped";

const SSH_BIN =
  ["/usr/bin/ssh", "/opt/homebrew/bin/ssh", "/usr/local/bin/ssh"].find((file) =>
    fs.existsSync(file),
  ) ?? "ssh";

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function pidMatches(pid: number, connection: Connection): boolean {
  try {
    const command = execFileSync(
      "/bin/ps",
      ["-p", String(pid), "-o", "command="],
      { encoding: "utf8" },
    );
    return (
      command.includes("ssh") &&
      command.includes(
        connection.mode === "socks5"
          ? `-D ${connection.port}`
          : `${connection.port}:${connection.remoteHost}:${connection.port}`,
      ) &&
      command.includes(connection.sshTarget)
    );
  } catch {
    return false;
  }
}

export function processSpec(connection: Connection): string {
  return connection.mode === "socks5"
    ? `-D ${connection.port}`
    : `${connection.port}:${connection.remoteHost}:${connection.port}`;
}

export function getStatus(connection: Connection): Status {
  const state = readState();
  const entry = state[connection.id];
  if (entry && pidAlive(entry.pid) && pidMatches(entry.pid, connection))
    return "running";
  if (entry) {
    delete state[connection.id];
    writeState(state);
  }
  return "stopped";
}

export function getPid(connection: Connection): number | undefined {
  return readState()[connection.id]?.pid;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startTunnel(connection: Connection): Promise<void> {
  if (getStatus(connection) === "running") return;

  const args = buildArgs(connection);
  const proc = spawn(SSH_BIN, args, {
    detached: true,
    stdio: "ignore",
  });
  proc.unref();
  if (!proc.pid) throw new Error("SSH gagal dijalankan");

  const state = readState();
  state[connection.id] = {
    pid: proc.pid,
    spec: processSpec(connection),
    startedAt: Date.now(),
  };
  writeState(state);

  await sleep(1200);
  if (!pidAlive(proc.pid)) {
    const nextState = readState();
    delete nextState[connection.id];
    writeState(nextState);
    throw new Error(
      "SSH gagal terhubung. Pastikan SSH key/agent dan host benar.",
    );
  }
}

export async function stopTunnel(connection: Connection): Promise<void> {
  const state = readState();
  const entry = state[connection.id];
  if (!entry) return;

  try {
    process.kill(entry.pid, "SIGTERM");
  } catch {
    // Process already exited.
  }
  for (let i = 0; i < 20 && pidAlive(entry.pid); i += 1) await sleep(100);
  if (pidAlive(entry.pid)) {
    try {
      process.kill(entry.pid, "SIGKILL");
    } catch {
      // Process already exited.
    }
  }
  delete state[connection.id];
  writeState(state);
}

export function uptime(connection: Connection): string | undefined {
  const entry = readState()[connection.id];
  if (!entry || getStatus(connection) !== "running") return undefined;
  const seconds = Math.floor((Date.now() - entry.startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
