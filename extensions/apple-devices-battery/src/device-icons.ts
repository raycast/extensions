import { LocalStorage } from "@raycast/api";

export const DEVICE_ICONS = [
  { id: "macbook", label: "MacBook", asset: "device-macbook.png" },
  { id: "imac", label: "iMac", asset: "device-imac.png" },
  { id: "mac-mini", label: "Mac mini", asset: "device-mac-mini.png" },
  { id: "mac-pro", label: "Mac Pro", asset: "device-mac-pro.png" },
  { id: "mac-studio", label: "Mac Studio", asset: "device-mac-studio.png" },
  { id: "iphone", label: "iPhone", asset: "device-iphone.png" },
  { id: "ipad", label: "iPad", asset: "device-ipad.png" },
  { id: "airpods", label: "AirPods", asset: "device-airpods.png" },
  { id: "airpods-pro", label: "AirPods Pro", asset: "device-airpods-pro.png" },
  { id: "airpods-max", label: "AirPods Max", asset: "device-airpods-max.png" },
  {
    id: "airpods-case",
    label: "AirPods Case",
    asset: "device-airpods-case.png",
  },
  {
    id: "apple-watch",
    label: "Apple Watch",
    asset: "device-apple-watch.png",
  },
  { id: "mouse", label: "Magic Mouse", asset: "device-mouse.png" },
  { id: "trackpad", label: "Trackpad", asset: "device-trackpad.png" },
  { id: "keyboard", label: "Keyboard", asset: "device-keyboard.png" },
  { id: "headphones", label: "Headphones", asset: "device-headphones.png" },
  { id: "homepod", label: "HomePod", asset: "device-homepod.png" },
  {
    id: "homepod-mini",
    label: "HomePod mini",
    asset: "device-homepod-mini.png",
  },
  { id: "apple-tv", label: "Apple TV", asset: "device-apple-tv.png" },
  {
    id: "gamecontroller",
    label: "Game Controller",
    asset: "device-gamecontroller.png",
  },
  { id: "speaker", label: "Speaker", asset: "device-speaker.png" },
  { id: "pencil", label: "Apple Pencil", asset: "device-pencil.png" },
  { id: "display", label: "Display", asset: "device-display.png" },
  {
    id: "battery-pack",
    label: "Battery Pack",
    asset: "device-battery-pack.png",
  },
  { id: "bluetooth", label: "Bluetooth", asset: "device-bluetooth.png" },
] as const;

export type DeviceIconId = (typeof DEVICE_ICONS)[number]["id"];

const STORAGE_KEY = "device-icon-overrides";

interface IconOverrides {
  [deviceAddress: string]: DeviceIconId;
}

let cache: IconOverrides | null = null;

export async function loadIconOverrides(): Promise<IconOverrides> {
  if (cache) return cache;
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  cache = raw ? JSON.parse(raw) : {};
  return cache!;
}

export async function setIconOverride(
  deviceAddress: string,
  iconId: DeviceIconId,
): Promise<void> {
  const overrides = await loadIconOverrides();
  overrides[deviceAddress] = iconId;
  cache = overrides;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export async function removeIconOverride(deviceAddress: string): Promise<void> {
  const overrides = await loadIconOverrides();
  delete overrides[deviceAddress];
  cache = overrides;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getIconAsset(iconId: DeviceIconId): string {
  const entry = DEVICE_ICONS.find((i) => i.id === iconId);
  return entry?.asset ?? "device-bluetooth.png";
}

export function invalidateCache(): void {
  cache = null;
}
