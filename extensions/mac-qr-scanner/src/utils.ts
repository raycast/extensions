import { LocalStorage } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

// --- Types ---

export interface WifiNetwork {
  ssid: string;
  password: string;
  security: string;
  hidden: boolean;
}

export type HistoryEntryType = "text" | "url" | "wifi";

export interface HistoryEntry {
  id: string;
  data: string;
  type: HistoryEntryType;
  timestamp: number;
  wifiNetwork?: WifiNetwork;
}

// --- Helpers ---

export function looksLikeUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseWifi(text: string): WifiNetwork | null {
  if (!text.startsWith("WIFI:")) return null;

  const body = text.slice(5).replace(/;;\s*$/, "");
  const params: Record<string, string> = {};

  for (const part of body.split(/(?<!\\);/)) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).toUpperCase();
    const value = part.slice(colonIdx + 1).replace(/\\(.)/g, "$1");
    params[key] = value;
  }

  if (!params.S) return null;

  return {
    ssid: params.S,
    password: params.P || "",
    security: params.T || "nopass",
    hidden: params.H === "true",
  };
}

export async function connectToWifi(network: WifiNetwork): Promise<void> {
  const { stdout } = await execFileAsync("/usr/sbin/networksetup", [
    "-listallhardwareports",
  ]);
  const match = stdout.match(/Hardware Port: Wi-Fi\nDevice: (\w+)/);
  const iface = match ? match[1] : "en0";

  const args = ["-setairportnetwork", iface, network.ssid];

  if (!network.password) {
    await execFileAsync("/usr/sbin/networksetup", args);
    return;
  }

  await runNetworkSetupWithPasswordFromStdin([...args, "-"], network.password);
}

async function runNetworkSetupWithPasswordFromStdin(
  args: string[],
  password: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("/usr/sbin/networksetup", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(stderr.trim() || `networksetup exited with code ${code}`),
      );
    });

    proc.stdin.end(`${password}\n`);
  });
}

function classifyQrData(data: string): HistoryEntryType {
  if (parseWifi(data)) return "wifi";
  if (looksLikeUrl(data)) return "url";
  return "text";
}

// --- History Storage ---

const HISTORY_KEY = "scan-history";
const MAX_HISTORY = 100;

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveToHistory(data: string): Promise<void> {
  const history = await getHistory();
  const wifi = parseWifi(data);
  const entry: HistoryEntry = {
    id: randomUUID(),
    data,
    type: classifyQrData(data),
    timestamp: Date.now(),
    wifiNetwork: wifi ?? undefined,
  };
  history.unshift(entry);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function deleteFromHistory(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((e) => e.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
