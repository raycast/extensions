import { LocalStorage } from "@raycast/api";
import type { AudioDevice } from "./audio-device";

type IOType = "input" | "output";

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
const INPUT_ORDER_KEY = "deviceOrderInput";
const OUTPUT_ORDER_KEY = "deviceOrderOutput";

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

export async function getDeviceOrder(type: "input" | "output"): Promise<string[]> {
  return readList(type === "input" ? INPUT_ORDER_KEY : OUTPUT_ORDER_KEY);
}

export async function setDeviceOrder(type: "input" | "output", order: string[]) {
  await writeList(type === "input" ? INPUT_ORDER_KEY : OUTPUT_ORDER_KEY, order);
}

export function normalizeDeviceOrder(order: string[], devices: AudioDevice[]): string[] {
  const deviceIds = devices.map((device) => device.uid);
  const filtered = order.filter((id) => deviceIds.includes(id));
  const missing = deviceIds.filter((id) => !filtered.includes(id));
  return [...filtered, ...missing];
}

export function applyDeviceOrder(order: string[], devices: AudioDevice[]): AudioDevice[] {
  const normalized = normalizeDeviceOrder(order, devices);
  const deviceMap = new Map(devices.map((device) => [device.uid, device]));
  return normalized.map((id) => deviceMap.get(id)).filter(Boolean) as AudioDevice[];
}
