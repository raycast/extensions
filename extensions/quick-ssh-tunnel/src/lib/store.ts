import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { connectionKey } from "./core";

export type Connection = {
  id: string;
  mode: "forward" | "socks5";
  sshTarget: string;
  port: number;
  remoteHost: string;
  compression: boolean;
  lastUsedAt: number;
};

type StateEntry = {
  pid: number;
  spec: string;
  startedAt: number;
};

export const CONFIG_DIR = path.join(
  os.homedir(),
  ".config",
  "quick-ssh-tunnel",
);
export const HISTORY_FILE = path.join(CONFIG_DIR, "connections.json");
export const STATE_FILE = path.join(CONFIG_DIR, "state.json");
export const MAX_HISTORY = 50;

function ensureDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function withLock<T>(file: string, fn: () => T): T {
  ensureDir();
  const lockFile = `${file}.lock`;
  const maxAttempts = 50;
  let attempts = 0;
  let acquired = false;

  while (attempts < maxAttempts) {
    try {
      const fd = fs.openSync(lockFile, "wx");
      fs.closeSync(fd);
      acquired = true;
      break;
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === "EEXIST") {
        try {
          const stat = fs.statSync(lockFile);
          if (Date.now() - stat.mtimeMs > 5000) {
            fs.unlinkSync(lockFile);
          }
        } catch {
          // ignore error if lock was already removed
        }
        attempts += 1;
        const start = Date.now();
        while (Date.now() - start < 10) {
          // busy spin 10ms
        }
      } else {
        throw err;
      }
    }
  }

  if (!acquired) {
    throw new Error(`Gagal memperoleh lock untuk ${file}`);
  }

  try {
    return fn();
  } finally {
    if (acquired) {
      try {
        fs.unlinkSync(lockFile);
      } catch {
        // ignore
      }
    }
  }
}

function atomicWriteFileSync(file: string, data: string): void {
  ensureDir();
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}
export function newId(): string {
  return crypto.randomUUID();
}

export function cloneConnection(connection: Connection): Connection {
  return { ...connection, id: newId(), lastUsedAt: Date.now() };
}

export function loadConnections(): Connection[] {
  ensureDir();
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    return Array.isArray(data.connections)
      ? (data.connections as Connection[])
      : [];
  } catch {
    return [];
  }
}

function saveConnections(connections: Connection[]): void {
  atomicWriteFileSync(HISTORY_FILE, JSON.stringify({ connections }, null, 2));
}

export function saveConnection(connection: Connection): Connection[] {
  return withLock(HISTORY_FILE, () => {
    const key = connectionKey(connection);
    const connections = loadConnections().filter(
      (item) => item.id !== connection.id && connectionKey(item) !== key,
    );
    connections.unshift(connection);
    const updated = connections.slice(0, MAX_HISTORY);
    saveConnections(updated);
    return updated;
  });
}

export function findConnectionByKey(key: string): Connection | undefined {
  return loadConnections().find(
    (connection) => connectionKey(connection) === key,
  );
}

export function removeConnection(id: string): Connection[] {
  return withLock(HISTORY_FILE, () => {
    const connections = loadConnections().filter(
      (connection) => connection.id !== id,
    );
    saveConnections(connections);
    return connections;
  });
}

export function readState(): Record<string, StateEntry> {
  ensureDir();
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as Record<
      string,
      StateEntry
    >;
  } catch {
    return {};
  }
}

export function writeState(state: Record<string, StateEntry>): void {
  atomicWriteFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function updateState<T>(
  fn: (state: Record<string, StateEntry>) => T,
): T {
  return withLock(STATE_FILE, () => {
    const state = readState();
    const result = fn(state);
    writeState(state);
    return result;
  });
}
