import { LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);
const NETWORK_SETUP_TIMEOUT_MS = 15000;

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

  for (const part of splitWifiFields(body)) {
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

function splitWifiFields(body: string): string[] {
  const fields: string[] = [];
  let fieldStart = 0;

  for (let index = 0; index < body.length; index++) {
    if (body[index] !== ";" || isEscaped(body, index)) continue;

    fields.push(body.slice(fieldStart, index));
    fieldStart = index + 1;
  }

  fields.push(body.slice(fieldStart));
  return fields;
}

function isEscaped(text: string, index: number): boolean {
  let backslashCount = 0;

  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor--) {
    backslashCount++;
  }

  return backslashCount % 2 === 1;
}

export async function connectToWifi(network: WifiNetwork): Promise<void> {
  const { stdout } = await execFileAsync(
    "/usr/sbin/networksetup",
    ["-listallhardwareports"],
    { timeout: NETWORK_SETUP_TIMEOUT_MS },
  );
  const match = stdout.match(/Hardware Port: Wi-Fi\nDevice: (\w+)/);
  const iface = match ? match[1] : "en0";

  const args = ["-setairportnetwork", iface, network.ssid];

  try {
    if (!network.password) {
      await execFileAsync("/usr/sbin/networksetup", args, {
        timeout: NETWORK_SETUP_TIMEOUT_MS,
      });
      return;
    }

    await execFileAsync("/usr/sbin/networksetup", [...args, network.password], {
      timeout: NETWORK_SETUP_TIMEOUT_MS,
    });
  } catch (error) {
    throw new Error(sanitizeNetworkSetupError(error, network));
  }
}

export function sanitizeNetworkSetupError(
  error: unknown,
  network: WifiNetwork,
): string {
  const raw = error instanceof Error ? error.message : String(error);
  const redactions = [network.ssid, network.password].filter(Boolean);
  return redactions.reduce(
    (message, secret) => message.split(secret).join("[redacted]"),
    raw,
  );
}

function escapeWifiValue(value: string): string {
  return value.replace(/[\\;,:]/g, "\\$&");
}

function historyDataFor(data: string, wifi: WifiNetwork | null): string {
  if (!wifi) return data;

  const fields = [
    `T:${escapeWifiValue(wifi.security)}`,
    `S:${escapeWifiValue(wifi.ssid)}`,
    wifi.hidden ? "H:true" : "",
  ].filter((part) => part !== "");

  return `WIFI:${fields.join(";")};;`;
}

function historyWifiNetwork(wifi: WifiNetwork | null): WifiNetwork | undefined {
  if (!wifi) return undefined;

  return {
    ...wifi,
    password: "",
  };
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
  let raw: string | undefined;

  try {
    raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  } catch {
    return [];
  }

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

function isHistoryEntry(entry: unknown): entry is HistoryEntry {
  if (!entry || typeof entry !== "object") return false;

  const candidate = entry as Partial<HistoryEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.data === "string" &&
    isHistoryEntryType(candidate.type) &&
    typeof candidate.timestamp === "number" &&
    Number.isFinite(candidate.timestamp) &&
    (candidate.wifiNetwork === undefined ||
      isWifiNetwork(candidate.wifiNetwork))
  );
}

function isHistoryEntryType(type: unknown): type is HistoryEntryType {
  return type === "text" || type === "url" || type === "wifi";
}

function isWifiNetwork(network: unknown): network is WifiNetwork {
  if (!network || typeof network !== "object") return false;

  const candidate = network as Partial<WifiNetwork>;
  return (
    typeof candidate.ssid === "string" &&
    typeof candidate.password === "string" &&
    typeof candidate.security === "string" &&
    typeof candidate.hidden === "boolean"
  );
}

export async function saveToHistory(data: string): Promise<void> {
  const history = await getHistory();
  const wifi = parseWifi(data);
  const entry: HistoryEntry = {
    id: randomUUID(),
    data: historyDataFor(data, wifi),
    type: classifyQrData(data),
    timestamp: Date.now(),
    wifiNetwork: historyWifiNetwork(wifi),
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
