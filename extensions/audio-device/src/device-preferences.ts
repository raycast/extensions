import { LocalStorage } from "@raycast/api";
import type { AudioDevice } from "./audio-device";

const DISABLED_DEVICES_KEY = "disabledDevices";
const LEGACY_HIDDEN_DEVICES_KEY = "hiddenDevices";
const SHOW_HIDDEN_KEY = "showHiddenDevices";
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

export async function getDisabledDevices(): Promise<string[]> {
  const disabled = await readList(DISABLED_DEVICES_KEY);
  if (disabled.length > 0) return disabled;

  const legacyHidden = await readList(LEGACY_HIDDEN_DEVICES_KEY);
  if (legacyHidden.length > 0) {
    await writeList(DISABLED_DEVICES_KEY, legacyHidden);
    return legacyHidden;
  }

  return [];
}

export async function setDisabledDevices(list: string[]) {
  await writeList(DISABLED_DEVICES_KEY, list);
}

export async function disableDevice(deviceId: string) {
  const disabled = await getDisabledDevices();
  if (!disabled.includes(deviceId)) {
    disabled.push(deviceId);
    await setDisabledDevices(disabled);
  }
}

export async function enableDevice(deviceId: string) {
  const disabled = await getDisabledDevices();
  const next = disabled.filter((id) => id !== deviceId);
  if (next.length !== disabled.length) {
    await setDisabledDevices(next);
  }
}

export async function toggleDeviceVisibility(deviceId: string) {
  const disabled = await getDisabledDevices();
  const index = disabled.indexOf(deviceId);
  if (index === -1) {
    disabled.push(deviceId);
  } else {
    disabled.splice(index, 1);
  }
  await setDisabledDevices(disabled);
}

export async function getHiddenDevices(): Promise<string[]> {
  return getDisabledDevices();
}

export async function isShowingHiddenDevices() {
  return (await LocalStorage.getItem(SHOW_HIDDEN_KEY)) === "true";
}

export async function setShowHiddenDevices(show: boolean) {
  await LocalStorage.setItem(SHOW_HIDDEN_KEY, show ? "true" : "false");
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
