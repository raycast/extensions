import type { DeviceCategory, DeviceRecord } from "./types";

export function categorizeDevice(modelRaw?: string, typeRaw?: string): DeviceCategory {
  const model = (modelRaw ?? "").toUpperCase();
  const type = (typeRaw ?? "").toUpperCase();

  if (type.includes("PLUG") || type.includes("SWITCH")) return "plug";
  if (type.includes("BULB") || type.includes("LIGHT")) return "light";
  if (type.includes("CAMERA") || type.includes("CAM")) return "camera";

  if (model.startsWith("P")) return "plug";
  if (model.startsWith("L")) return "light";
  if (model.startsWith("C")) return "camera";

  return "other";
}

export function supportsPower(category: DeviceCategory): boolean {
  return category === "plug" || category === "light";
}

export function supportsColor(modelRaw?: string, category?: DeviceCategory): boolean {
  if (category && category !== "light") return false;
  if (!category && !(modelRaw ?? "").trim()) return false;
  return true;
}

export function supportsBrightness(category: DeviceCategory): boolean {
  return category === "light";
}

export function readDeviceOn(info: unknown): boolean | null {
  if (!info || typeof info !== "object") return null;
  const data = info as { device_on?: boolean; deviceOn?: boolean };
  if (typeof data.device_on === "boolean") return data.device_on;
  if (typeof data.deviceOn === "boolean") return data.deviceOn;
  return null;
}

export function formatDeviceTitle(device: DeviceRecord): string {
  const alias = device.alias?.trim();
  if (alias) return alias;
  if (device.model) return device.model;
  return device.id;
}
