import { LocalStorage } from "@raycast/api";
import { Device } from "./types";

const DEVICES_KEY = "t3-devices";
const ACTIVE_DEVICE_KEY = "t3-active-device-id";

export async function getDevices(): Promise<Device[]> {
  const raw = await LocalStorage.getItem<string>(DEVICES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Device[];
  } catch {
    return [];
  }
}

export async function saveDevices(devices: Device[]): Promise<void> {
  await LocalStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
}

export async function addDevice(device: Device): Promise<void> {
  const devices = await getDevices();
  devices.push(device);
  await saveDevices(devices);
}

export async function updateDevice(
  id: string,
  updates: Partial<
    Pick<
      Device,
      | "name"
      | "baseUrl"
      | "environmentId"
      | "accessToken"
      | "tokenExpiresAt"
      | "pairingUrl"
      | "lastSeenAt"
    >
  >,
): Promise<void> {
  const devices = await getDevices();
  const idx = devices.findIndex((d) => d.id === id);
  if (idx === -1) return;
  devices[idx] = { ...devices[idx], ...updates };
  await saveDevices(devices);
}

export async function removeDevice(id: string): Promise<void> {
  const devices = await getDevices();
  await saveDevices(devices.filter((d) => d.id !== id));
  const activeId = await getActiveDeviceId();
  if (activeId === id) {
    const remaining = devices.filter((d) => d.id !== id);
    if (remaining.length > 0) {
      await setActiveDeviceId(remaining[0].id);
    } else {
      await LocalStorage.removeItem(ACTIVE_DEVICE_KEY);
    }
  }
}

export async function getActiveDeviceId(): Promise<string | null> {
  const id = await LocalStorage.getItem<string>(ACTIVE_DEVICE_KEY);
  return id ?? null;
}

export async function setActiveDeviceId(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_DEVICE_KEY, id);
}

export async function getActiveDevice(): Promise<Device | null> {
  const activeId = await getActiveDeviceId();
  if (!activeId) return null;
  const devices = await getDevices();
  return devices.find((d) => d.id === activeId) ?? null;
}
