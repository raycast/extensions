// Everything the extension stores, per direction, in Raycast LocalStorage.
import { LocalStorage } from "@raycast/api";
import { type IOType, getDevices } from "./audio-device";
import type { ConnectMode, ConnectOverrides } from "./priority/connect-mode";
import { makeSnapshot, type PriorityEntry, type Snapshot } from "./priority/decide";
import { removeEntry } from "./priority/list";
import { setMeta, type DeviceMeta, type DeviceMetaMap } from "./priority/meta";

const key = (name: string, type: IOType) => `${name}_${type}`;

const KEYS = {
  hidden: "hiddenDevices",
  showHidden: "showHiddenDevices",
  priorities: "priorities",
  snapshot: "snapshot",
  connectModes: "connectModes",
  meta: "deviceMeta",
  pinnedVolumes: "pinnedVolumes",
} as const;

async function readJson(name: string): Promise<unknown> {
  const raw = await LocalStorage.getItem<string>(name);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const writeJson = (name: string, value: unknown) => LocalStorage.setItem(name, JSON.stringify(value));

const isString = (v: unknown): v is string => typeof v === "string";
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// --- Hidden devices ---

export async function getHiddenDevices(type: IOType): Promise<string[]> {
  const parsed = await readJson(key(KEYS.hidden, type));
  return Array.isArray(parsed) ? parsed.filter(isString) : [];
}

export async function toggleDeviceVisibility(type: IOType, uid: string) {
  const hidden = await getHiddenDevices(type);
  const next = hidden.includes(uid) ? hidden.filter((u) => u !== uid) : [...hidden, uid];
  await writeJson(key(KEYS.hidden, type), next);
}

export async function isShowingHiddenDevices(type: IOType): Promise<boolean> {
  return (await LocalStorage.getItem<string>(key(KEYS.showHidden, type))) === "true";
}

export async function setShowHiddenDevices(type: IOType, show: boolean) {
  await LocalStorage.setItem(key(KEYS.showHidden, type), show ? "true" : "false");
}

// --- Priority list ---

/** Ordered best → worst. Array position is the priority; there are no ties or gaps. */
export async function getPriorityList(type: IOType): Promise<PriorityEntry[]> {
  const parsed = await readJson(key(KEYS.priorities, type));
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const result: PriorityEntry[] = [];
  for (const item of parsed) {
    if (!isRecord(item) || !isString(item.uid) || seen.has(item.uid)) continue;
    seen.add(item.uid);
    result.push({ uid: item.uid, name: isString(item.name) ? item.name : item.uid });
  }
  return result;
}

export async function setPriorityList(type: IOType, list: PriorityEntry[]) {
  await writeJson(key(KEYS.priorities, type), list);
}

/** A hidden device cannot have a priority. */
export async function removeFromPriorityList(type: IOType, uid: string) {
  const list = await getPriorityList(type);
  const next = removeEntry(list, uid);
  if (next.length !== list.length) await setPriorityList(type, next);
}

// --- Snapshot of the last run (what Auto Switch compares against) ---

export async function getSnapshot(type: IOType): Promise<Snapshot | null> {
  const parsed = await readJson(key(KEYS.snapshot, type));
  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.uids) ||
    !parsed.uids.every(isString) ||
    !isString(parsed.currentUid) ||
    typeof parsed.ts !== "number" ||
    !Number.isFinite(parsed.ts)
  ) {
    return null;
  }
  return { uids: parsed.uids, currentUid: parsed.currentUid, ts: parsed.ts };
}

export async function setSnapshot(type: IOType, snapshot: Snapshot) {
  await writeJson(key(KEYS.snapshot, type), snapshot);
}

/**
 * Record a manual switch (list, cycle) so the next background run sees it as expected, not as an event.
 * Stores the whole current state, not only the device: a device that connected after the last background run
 * would otherwise still count as "new" and win over the manual choice, and an old timestamp would look like
 * a wake from sleep. Either would undo the switch on the next run.
 */
export async function recordCurrentDevice(type: IOType, currentUid: string) {
  await setSnapshot(type, makeSnapshot(await getDevices(type), currentUid, Date.now()));
}

// --- Switch on Connect (devices without a priority) ---

export async function getConnectOverrides(type: IOType): Promise<ConnectOverrides> {
  const parsed = await readJson(key(KEYS.connectModes, type));
  if (!isRecord(parsed)) return {};
  const result: ConnectOverrides = {};
  for (const [uid, mode] of Object.entries(parsed)) {
    if (mode === "switch" || mode === "none") result[uid] = mode;
  }
  return result;
}

/** Store the user's choice for a device; undefined goes back to the default. */
export async function setConnectOverride(type: IOType, uid: string, mode: ConnectMode | undefined) {
  const overrides = await getConnectOverrides(type);
  if (mode) overrides[uid] = mode;
  else delete overrides[uid];
  await writeJson(key(KEYS.connectModes, type), overrides);
}

// --- Device customization (display name, icon) ---

export async function getDeviceMeta(type: IOType): Promise<DeviceMetaMap> {
  const parsed = await readJson(key(KEYS.meta, type));
  if (!isRecord(parsed)) return {};
  const result: DeviceMetaMap = {};
  for (const [uid, value] of Object.entries(parsed)) {
    if (!isRecord(value)) continue;
    const meta: DeviceMeta = {};
    if (isString(value.name) && value.name) meta.name = value.name;
    if (isString(value.icon) && value.icon) meta.icon = value.icon;
    if (meta.name || meta.icon) result[uid] = meta;
  }
  return result;
}

export async function setDeviceMeta(type: IOType, uid: string, meta: DeviceMeta, systemName: string) {
  await writeJson(key(KEYS.meta, type), setMeta(await getDeviceMeta(type), uid, meta, systemName));
}

// --- Pinned volume (0–100 per device UID) ---

export async function getAllPinnedVolumes(type: IOType): Promise<Map<string, number>> {
  const parsed = await readJson(key(KEYS.pinnedVolumes, type));
  const map = new Map<string, number>();
  if (isRecord(parsed)) {
    for (const [uid, level] of Object.entries(parsed)) {
      if (typeof level === "number" && Number.isFinite(level)) map.set(uid, level);
    }
  }
  return map;
}

export async function setPinnedVolume(type: IOType, uid: string, level: number | undefined) {
  const pinned = await getAllPinnedVolumes(type);
  if (level === undefined) pinned.delete(uid);
  else pinned.set(uid, Math.round(Math.min(Math.max(level, 0), 100)));
  await writeJson(key(KEYS.pinnedVolumes, type), Object.fromEntries(pinned));
}
