import { LocalStorage } from "@raycast/api";
import { z } from "zod";
import { Device } from "./devices";

/** LocalStorage keys of the devices the user pinned (in their order) and hid. */
export const PINNED_KEY = "pinned-devices";
export const HIDDEN_KEY = "hidden-devices";

const keysSchema = z.array(z.string());

/** A stable key for a device. Android emulator names and Apple UDIDs are unique within their OS. */
export function getDeviceKey(device: Device): string {
  return `${device.osType}:${device.id}`;
}

async function readKeys(key: string): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];
  try {
    const parsed = keysSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Pinned and hidden devices, for code that runs outside a view, such as AI tools. */
export async function getOrganization(): Promise<{ pinned: string[]; hidden: string[] }> {
  const [pinned, hidden] = await Promise.all([readKeys(PINNED_KEY), readKeys(HIDDEN_KEY)]);
  return { pinned, hidden };
}

/** Sorts pinned devices first, in the order the user gave them, and keeps the order of the others. */
export function sortPinnedFirst(devices: Device[], pinned: string[]): Device[] {
  const rank = (device: Device) => {
    const index = pinned.indexOf(getDeviceKey(device));
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...devices].sort((a, b) => rank(a) - rank(b));
}
