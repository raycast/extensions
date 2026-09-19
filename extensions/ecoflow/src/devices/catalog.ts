import type { DeviceCategory, DeviceFamily, DeviceProfile } from "../types/device";

export interface DeviceCategoryDefinition {
  category: DeviceCategory;
  emoji: string;
  label: string;
  pluralLabel: string;
}

export type ApiSupportLevel = "documented" | "legacy" | "generic";

export const DEVICE_CATEGORIES: readonly DeviceCategoryDefinition[] = [
  { category: "power-station", emoji: "🔋", label: "Power Station", pluralLabel: "Power Stations" },
  { category: "home-battery", emoji: "🏠", label: "Home Battery", pluralLabel: "Home Batteries" },
  { category: "solar", emoji: "☀️", label: "Solar", pluralLabel: "Solar" },
  { category: "whole-home", emoji: "⚡️", label: "Whole-Home System", pluralLabel: "Whole-Home Systems" },
  { category: "power-kit", emoji: "🚐", label: "Power Kit", pluralLabel: "Power Kits" },
  { category: "appliance", emoji: "❄️", label: "Appliance", pluralLabel: "Appliances" },
  { category: "smart-plug", emoji: "🔌", label: "Smart Plug", pluralLabel: "Smart Plugs" },
  { category: "unknown", emoji: "❓", label: "Other Device", pluralLabel: "Other Devices" },
];

export const DOCUMENTED_API_DEVICE_FAMILIES = [
  "power-ocean",
  "powerstream",
  "stream",
  "delta-3-max-plus",
  "delta-3-max",
  "delta-pro",
  "delta-pro-ultra",
  "delta-pro-3",
  "river-2-pro",
  "delta-2-max",
  "delta-2",
  "smart-home-panel-2",
  "smart-home-panel",
  "power-kits",
  "smart-plug",
  "glacier",
  "wave",
] as const satisfies readonly DeviceFamily[];

const DOCUMENTED_API_DEVICE_FAMILY_SET = new Set<DeviceFamily>(DOCUMENTED_API_DEVICE_FAMILIES);

export function getDeviceCategory(category: DeviceCategory): DeviceCategoryDefinition {
  return DEVICE_CATEGORIES.find((definition) => definition.category === category) ?? DEVICE_CATEGORIES.at(-1)!;
}

export function getApiSupportLevel(profile: DeviceProfile): ApiSupportLevel {
  if (profile.family === "unknown") return "generic";
  return DOCUMENTED_API_DEVICE_FAMILY_SET.has(profile.family) ? "documented" : "legacy";
}

export function getApiSupportLabel(profile: DeviceProfile): string {
  switch (getApiSupportLevel(profile)) {
    case "documented":
      return "Documented API family";
    case "legacy":
      return "Legacy compatibility";
    case "generic":
      return "Generic read-only support";
  }
}
