import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

export type Tunnel = {
  id: string;
  name: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  sshTarget: string;
  sshPort?: number;
  compression?: boolean;
  autoReconnect?: boolean;
  extraArgs?: string;
};

/**
 * Sengaja memakai lokasi yang sama dengan ssh-tunnel-tui, supaya daftar tunnel
 * yang dibuat di terminal langsung muncul di Raycast, dan sebaliknya.
 */
export const CONFIG_DIR = path.join(os.homedir(), ".config", "ssh-tunnel-tui");
export const CONFIG_FILE = path.join(CONFIG_DIR, "tunnels.json");
export const STATE_FILE = path.join(CONFIG_DIR, "state.json");
export const LOG_DIR = path.join(CONFIG_DIR, "logs");

export function ensureDirs(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function newId(): string {
  return crypto.randomUUID();
}

export function loadTunnels(): Tunnel[] {
  ensureDirs();
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    return Array.isArray(data.tunnels) ? (data.tunnels as Tunnel[]) : [];
  } catch {
    return [];
  }
}

function saveTunnels(tunnels: Tunnel[]): void {
  ensureDirs();
  const tmp = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ tunnels }, null, 2));
  fs.renameSync(tmp, CONFIG_FILE);
}

export function addTunnel(tunnel: Tunnel): Tunnel[] {
  const tunnels = loadTunnels();
  tunnels.push(tunnel);
  saveTunnels(tunnels);
  return tunnels;
}

export function updateTunnel(id: string, patch: Partial<Tunnel>): Tunnel[] {
  const tunnels = loadTunnels();
  const idx = tunnels.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tunnels[idx] = { ...tunnels[idx], ...patch };
    saveTunnels(tunnels);
  }
  return tunnels;
}

export function removeTunnel(id: string): Tunnel[] {
  const tunnels = loadTunnels().filter((t) => t.id !== id);
  saveTunnels(tunnels);
  return tunnels;
}

/** Cari tunnel lain yang memakai port lokal yang sama. */
export function portConflict(
  localPort: number,
  ignoreId?: string,
): Tunnel | undefined {
  return loadTunnels().find(
    (t) => t.localPort === localPort && t.id !== ignoreId,
  );
}
