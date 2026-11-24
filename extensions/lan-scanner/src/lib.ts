import { environment, getPreferenceValues } from "@raycast/api";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type Port = {
  port: number;
  proto: string;
  service: string | null;
  product: string | null;
  extra: string | null;
  title: string | null;
};

export type Device = {
  key: string;
  mac: string | null;
  ip: string;
  vendor?: string | null;
  randomMac?: boolean;
  hostname?: string;
  mdnsName?: string;
  firstSeen: number;
  lastSeen: number;
  online: boolean;
  isSelf?: boolean;
  isGateway?: boolean;
  ports?: Port[];
  portsScannedAt?: number;
  scanningPorts?: boolean;
  osHint?: string | null;
  type?: string | null;
  firmware?: Firmware;
};

export type Firmware = {
  kind: string;
  name?: string | null;
  version?: string | null;
  model?: string | null;
  id?: string | null;
  details?: Record<string, string | number | boolean>;
};

export type ScanInfo = {
  running: boolean;
  pid: number | null;
  startedAt?: number;
  finishedAt?: number;
  phase?: string;
  done?: number;
  total?: number;
  error?: string | null;
  liveCount?: number;
};

export type State = {
  scan?: ScanInfo;
  network?: { iface: string; cidr: string; gateway: string | null; selfIp: string };
  lastFullScanAt?: number;
  devices: Record<string, Device>;
};

type Prefs = { autoScanMinutes?: string; portMaxAgeHours?: string; backgroundScan?: boolean };
export const prefs = () => getPreferenceValues<Prefs>();

export const dataDir = environment.supportPath;
const statePath = () => path.join(dataDir, "state.json");
const lockPath = () => path.join(dataDir, "scan.lock");
export const namesPath = () => path.join(dataDir, "names.json");

export function readState(): State {
  try {
    return JSON.parse(fs.readFileSync(statePath(), "utf8"));
  } catch {
    return { devices: {} };
  }
}

function pidAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function isScanRunning(): boolean {
  try {
    const pid = Number(fs.readFileSync(lockPath(), "utf8"));
    return !!pid && pidAlive(pid);
  } catch {
    return false;
  }
}

/** Starts the scanner as a detached process, so it keeps running after Raycast closes. */
export function startScan(opts: { forcePorts?: boolean; host?: string } = {}): boolean {
  if (isScanRunning()) return false;
  fs.mkdirSync(dataDir, { recursive: true });
  const args = [path.join(environment.assetsPath, "scanner.mjs"), dataDir];
  if (opts.forcePorts) args.push("--force-ports");
  if (opts.host) args.push("--host", opts.host);
  args.push("--port-max-age-h", String(Number(prefs().portMaxAgeHours) || 12));
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin` },
  });
  child.unref();
  return true;
}

export function shouldAutoScan(s: State): boolean {
  const mins = Number(prefs().autoScanMinutes ?? "15");
  if (!mins || isScanRunning()) return false;
  return !s.lastFullScanAt || Date.now() - s.lastFullScanAt > mins * 60_000;
}

/** Remove a device from state (only when no scan runs; scanner would overwrite otherwise). */
export function forgetDevice(key: string): boolean {
  if (isScanRunning()) return false;
  const s = readState();
  delete s.devices[key];
  const tmp = `${statePath()}.ui.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s, null, 1));
  fs.renameSync(tmp, statePath());
  return true;
}

export function readNames(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(namesPath(), "utf8"));
  } catch {
    return {};
  }
}
export function writeName(key: string, name: string) {
  const n = readNames();
  if (name.trim()) n[key] = name.trim();
  else delete n[key];
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(namesPath(), JSON.stringify(n, null, 1));
}

export function ago(ts?: number): string {
  if (!ts) return "never";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function displayName(d: Device, names: Record<string, string>): string {
  return (
    names[d.key] ||
    (d.firmware?.name && d.firmware.kind !== "Web" ? `${d.firmware.name}` : null) ||
    (d.mdnsName ? d.mdnsName.replace(/\.local$/, "") : null) ||
    (d.hostname && d.hostname !== d.ip ? d.hostname : null) ||
    d.type ||
    d.vendor ||
    "Unknown device"
  );
}

export function ipSortKey(ip: string) {
  return ip.split(".").reduce((a, o) => a * 256 + Number(o), 0);
}
