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
  ensureDir();
  const tmp = `${HISTORY_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ connections }, null, 2));
  fs.renameSync(tmp, HISTORY_FILE);
}

export function saveConnection(connection: Connection): Connection[] {
  const key = connectionKey(connection);
  const connections = loadConnections().filter(
    (item) => item.id !== connection.id && connectionKey(item) !== key,
  );
  connections.unshift(connection);
  saveConnections(connections.slice(0, MAX_HISTORY));
  return connections.slice(0, MAX_HISTORY);
}

export function findConnectionByKey(key: string): Connection | undefined {
  return loadConnections().find(
    (connection) => connectionKey(connection) === key,
  );
}

export function removeConnection(id: string): Connection[] {
  const connections = loadConnections().filter(
    (connection) => connection.id !== id,
  );
  saveConnections(connections);
  return connections;
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
  ensureDir();
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}
