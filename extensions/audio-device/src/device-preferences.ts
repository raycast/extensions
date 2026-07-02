import { LocalStorage } from "@raycast/api";
import type { IOType } from "./audio-device";

const LEGACY_DISABLED_DEVICES_KEY = "disabledDevices";
const LEGACY_HIDDEN_DEVICES_KEY = "hiddenDevices";
const LEGACY_SHOW_HIDDEN_KEY = "showHiddenDevices";
const HIDDEN_DEVICES_KEYS = {
  input: "hiddenDevicesInput",
  output: "hiddenDevicesOutput",
} as const;
const SHOW_HIDDEN_KEYS = {
  input: "showHiddenDevicesInput",
  output: "showHiddenDevicesOutput",
} as const;
const DEFAULT_DEVICE_UID_KEYS = {
  input: "defaultDeviceUidInput",
  output: "defaultDeviceUidOutput",
} as const;
const DEFAULT_DEVICE_NAME_KEYS = {
  input: "defaultDeviceNameInput",
  output: "defaultDeviceNameOutput",
} as const;

function parseStoredList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readList(key: string): Promise<string[]> {
  return parseStoredList(await LocalStorage.getItem<string>(key));
}

async function writeList(key: string, list: string[]) {
  await LocalStorage.setItem(key, JSON.stringify(list));
}

function mergeUnique(...lists: string[][]): string[] {
  return Array.from(new Set(lists.flat()));
}

async function migrateHiddenDevices(type: IOType): Promise<string[]> {
  const storedRaw = await LocalStorage.getItem<string>(HIDDEN_DEVICES_KEYS[type]);
  if (storedRaw != null) return parseStoredList(storedRaw);

  const legacyHidden = await readList(LEGACY_HIDDEN_DEVICES_KEY);
  const legacyDisabled = await readList(LEGACY_DISABLED_DEVICES_KEY);
  const merged = mergeUnique(legacyHidden, legacyDisabled);
  if (merged.length > 0) {
    await writeList(HIDDEN_DEVICES_KEYS[type], merged);
  }
  return merged;
}

export async function getHiddenDevices(type: IOType): Promise<string[]> {
  return migrateHiddenDevices(type);
}

export async function setHiddenDevices(type: IOType, list: string[]) {
  await writeList(HIDDEN_DEVICES_KEYS[type], list);
}

export async function toggleDeviceVisibility(type: IOType, deviceId: string) {
  const hidden = await getHiddenDevices(type);
  const index = hidden.indexOf(deviceId);
  if (index === -1) {
    hidden.push(deviceId);
  } else {
    hidden.splice(index, 1);
  }
  await setHiddenDevices(type, hidden);
}

export async function isShowingHiddenDevices(type: IOType) {
  const stored = await LocalStorage.getItem<string>(SHOW_HIDDEN_KEYS[type]);
  if (stored != null) return stored === "true";
  const legacy = await LocalStorage.getItem<string>(LEGACY_SHOW_HIDDEN_KEY);
  if (legacy != null) {
    await LocalStorage.setItem(SHOW_HIDDEN_KEYS[type], legacy);
  }
  return legacy === "true";
}

export async function setShowHiddenDevices(type: IOType, show: boolean) {
  await LocalStorage.setItem(SHOW_HIDDEN_KEYS[type], show ? "true" : "false");
}

export async function getDefaultDeviceUid(type: IOType): Promise<string | undefined> {
  return (await LocalStorage.getItem<string>(DEFAULT_DEVICE_UID_KEYS[type])) || undefined;
}

export async function getDefaultDeviceName(type: IOType): Promise<string | undefined> {
  return (await LocalStorage.getItem<string>(DEFAULT_DEVICE_NAME_KEYS[type])) || undefined;
}

export async function setDefaultDevicePreference(type: IOType, uid: string, name: string) {
  await LocalStorage.setItem(DEFAULT_DEVICE_UID_KEYS[type], uid);
  await LocalStorage.setItem(DEFAULT_DEVICE_NAME_KEYS[type], name);
}

export async function clearDefaultDevicePreference(type: IOType) {
  await LocalStorage.removeItem(DEFAULT_DEVICE_UID_KEYS[type]);
  await LocalStorage.removeItem(DEFAULT_DEVICE_NAME_KEYS[type]);
}

// --- Pinned Volume ---

function pinnedVolumeKey(type: IOType, deviceUid: string): string {
  return `pinnedVolume_${type}_${deviceUid}`;
}

export async function getPinnedVolume(type: IOType, deviceUid: string): Promise<number | undefined> {
  const raw = await LocalStorage.getItem<string>(pinnedVolumeKey(type, deviceUid));
  if (raw == null) return undefined;
  const val = Number(raw);
  return Number.isFinite(val) ? val : undefined;
}

export async function setPinnedVolume(type: IOType, deviceUid: string, level: number) {
  await LocalStorage.setItem(pinnedVolumeKey(type, deviceUid), String(Math.round(Math.max(0, Math.min(100, level)))));
}

export async function clearPinnedVolume(type: IOType, deviceUid: string) {
  await LocalStorage.removeItem(pinnedVolumeKey(type, deviceUid));
}

export async function getAllPinnedVolumes(type: IOType): Promise<Map<string, number>> {
  const allItems = await LocalStorage.allItems();
  const prefix = `pinnedVolume_${type}_`;
  const map = new Map<string, number>();
  for (const [key, value] of Object.entries(allItems)) {
    if (key.startsWith(prefix)) {
      const uid = key.slice(prefix.length);
      const val = Number(value);
      if (Number.isFinite(val)) {
        map.set(uid, val);
      }
    }
  }
  return map;
}

// --- Grace period (skip enforcement after manual switch) ---

const GRACE_KEYS = {
  input: "graceUntil_input",
  output: "graceUntil_output",
} as const;

export async function setGraceUntil(type: IOType, until: number) {
  await LocalStorage.setItem(GRACE_KEYS[type], String(until));
}

export async function getGraceUntil(type: IOType): Promise<number> {
  const raw = await LocalStorage.getItem<string>(GRACE_KEYS[type]);
  return raw ? Number(raw) : 0;
}

// --- One-time migration from old priority-ordering system ---

const ORPHANED_KEYS = [
  "autoSwitchInputEnabled",
  "autoSwitchOutputEnabled",
  "autoSwitchLastRunInput",
  "autoSwitchLastRunOutput",
  "deviceOrderInput",
  "deviceOrderOutput",
];
const MIGRATION_SENTINEL = "_migrated_v3";
let migrationDone = false;

export async function migrateFromPriorityOrder(
  getInputDevicesFn: () => Promise<{ uid: string; name: string }[]>,
  getOutputDevicesFn: () => Promise<{ uid: string; name: string }[]>,
) {
  if (migrationDone) return;
  const sentinel = await LocalStorage.getItem<string>(MIGRATION_SENTINEL);
  if (sentinel) {
    migrationDone = true;
    return;
  }

  // Migrate: pick first device from old priority list as new default
  for (const ioType of ["input", "output"] as const) {
    const existingDefault = await getDefaultDeviceUid(ioType);
    if (existingDefault) continue; // User already set a default, don't overwrite

    const orderKey = ioType === "input" ? "deviceOrderInput" : "deviceOrderOutput";
    const orderRaw = await LocalStorage.getItem<string>(orderKey);
    const order = parseStoredList(orderRaw);
    if (order.length === 0) continue;

    const firstUid = order[0];
    const getDevices = ioType === "input" ? getInputDevicesFn : getOutputDevicesFn;
    const devices = await getDevices();
    const device = devices.find((d) => d.uid === firstUid);
    await setDefaultDevicePreference(ioType, firstUid, device?.name ?? firstUid);
  }

  // Clean up all orphaned keys
  for (const key of ORPHANED_KEYS) {
    await LocalStorage.removeItem(key);
  }
  await LocalStorage.setItem(MIGRATION_SENTINEL, "true");
  migrationDone = true;
}
