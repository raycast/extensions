import { LocalStorage } from "@raycast/api";
import { Preset, SEED_PRESETS } from "./extensions";

const KEYS = {
  userPresets: "pivot:userPresets",
  userPresetsSeeded: "pivot:userPresetsSeeded",
  customExts: "pivot:customExts",
  lastOp: "pivot:lastOp",
  lastApp: "pivot:lastApp",
  discoveredExts: "pivot:discoveredExts",
} as const;

export type LastOp = {
  targetBundleID: string;
  targetName: string;
  previousHandlers: Record<string, string | null>;
  timestamp: number;
};

export type DiscoveredExts = {
  exts: string[];
  signature: string;
  computedAt: number;
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function getUserPresets(): Promise<Preset[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.userPresets);
  if (typeof raw !== "string") {
    await writeJSON(KEYS.userPresets, SEED_PRESETS);
    await LocalStorage.setItem(KEYS.userPresetsSeeded, "1");
    return SEED_PRESETS;
  }
  let parsed: Preset[];
  try {
    parsed = JSON.parse(raw) as Preset[];
  } catch {
    return [];
  }
  const seeded = await LocalStorage.getItem<string>(KEYS.userPresetsSeeded);
  if (typeof seeded === "string") return parsed;
  const presentIds = new Set(parsed.map((p) => p.id));
  const missing = SEED_PRESETS.filter((s) => !presentIds.has(s.id));
  const next = missing.length === 0 ? parsed : [...missing, ...parsed];
  if (missing.length > 0) await writeJSON(KEYS.userPresets, next);
  await LocalStorage.setItem(KEYS.userPresetsSeeded, "1");
  return next;
}

export async function setUserPresets(presets: Preset[]): Promise<void> {
  await writeJSON(KEYS.userPresets, presets);
}

export async function getCustomExts(): Promise<string[]> {
  return readJSON<string[]>(KEYS.customExts, []);
}

export async function setCustomExts(exts: string[]): Promise<void> {
  await writeJSON(KEYS.customExts, exts);
}

export async function getLastOp(): Promise<LastOp | null> {
  return readJSON<LastOp | null>(KEYS.lastOp, null);
}

export async function setLastOp(op: LastOp | null): Promise<void> {
  if (op === null) {
    await LocalStorage.removeItem(KEYS.lastOp);
    return;
  }
  await writeJSON(KEYS.lastOp, op);
}

export async function getLastApp(): Promise<string | null> {
  const v = await LocalStorage.getItem<string>(KEYS.lastApp);
  return typeof v === "string" ? v : null;
}

export async function setLastApp(bundleID: string): Promise<void> {
  await LocalStorage.setItem(KEYS.lastApp, bundleID);
}

export async function getDiscoveredExts(): Promise<DiscoveredExts | null> {
  return readJSON<DiscoveredExts | null>(KEYS.discoveredExts, null);
}

export async function setDiscoveredExts(d: DiscoveredExts): Promise<void> {
  await writeJSON(KEYS.discoveredExts, d);
}
