import { execFileSync, spawn } from "child_process";
import fs from "fs";
import { buildArgs } from "./core";
import { readState, updateState } from "./store";
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

function processStartTime(pid: number): number | undefined {
  try {
    const lstart = execFileSync(
      "/bin/ps",
      ["-p", String(pid), "-o", "lstart="],
      { encoding: "utf8" },
    ).trim();
    if (!lstart) return undefined;
    const time = Date.parse(lstart);
    return Number.isNaN(time) ? undefined : time;
  } catch {
    return undefined;
  }
}

function pidMatches(
  pid: number,
  connection: Connection,
  startedAt?: number,
): boolean {
  try {
    const command = execFileSync(
      "/bin/ps",
      ["-p", String(pid), "-o", "command="],
      { encoding: "utf8" },
    );
    if (!command.includes("ssh")) return false;

    const expectedArgs = buildArgs(connection);
    for (const arg of expectedArgs) {
      if (!command.includes(arg)) return false;
    }

    if (startedAt) {
      const procStart = processStartTime(pid);
      if (procStart && procStart < startedAt - 5000) {
        return false;
      }
    }

    return true;
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
  return updateState((state) => {
    const entry = state[connection.id];
    if (
      entry &&
      pidAlive(entry.pid) &&
      pidMatches(entry.pid, connection, entry.startedAt)
    )
      return "running";
    if (entry) {
      delete state[connection.id];
    }
    return "stopped";
  });
}

export function getPid(connection: Connection): number | undefined {
  return readState()[connection.id]?.pid;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startTunnel(connection: Connection): Promise<void> {
  if (getStatus(connection) === "running") return;

  const startTime = Date.now();
  const args = buildArgs(connection);
  const proc = spawn(SSH_BIN, args, {
    detached: true,
    stdio: "ignore",
  });
  proc.unref();
  if (!proc.pid) throw new Error("SSH gagal dijalankan");

  updateState((state) => {
    state[connection.id] = {
      pid: proc.pid!,
      spec: processSpec(connection),
      startedAt: startTime,
    };
  });

  await sleep(1200);
  if (!pidAlive(proc.pid)) {
    updateState((state) => {
      delete state[connection.id];
    });
    throw new Error(
      "SSH gagal terhubung. Pastikan SSH key/agent dan host benar.",
    );
  }
}

export async function stopTunnel(connection: Connection): Promise<void> {
  const entry = readState()[connection.id];
  if (!entry) return;

  if (
    pidAlive(entry.pid) &&
    pidMatches(entry.pid, connection, entry.startedAt)
  ) {
    try {
      process.kill(entry.pid, "SIGTERM");
    } catch {
      // Process already exited.
    }
    for (
      let i = 0;
      i < 20 &&
      pidAlive(entry.pid) &&
      pidMatches(entry.pid, connection, entry.startedAt);
      i += 1
    ) {
      await sleep(100);
    }
    if (
      pidAlive(entry.pid) &&
      pidMatches(entry.pid, connection, entry.startedAt)
    ) {
      try {
        process.kill(entry.pid, "SIGKILL");
      } catch {
        // Process already exited.
      }
    }
  }

  updateState((state) => {
    delete state[connection.id];
  });
}

export function uptime(connection: Connection): string | undefined {
  const entry = readState()[connection.id];
  if (!entry || getStatus(connection) !== "running") return undefined;
  const seconds = Math.floor((Date.now() - entry.startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
