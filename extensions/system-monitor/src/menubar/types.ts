import { LaunchType } from "@raycast/api";

import { BatteryDataInterface, DiskInterface } from "../Interfaces";
import { OSInfo } from "../lib/os-version";
import { TemperatureData } from "../Temperature/TemperatureUtils";

export const MENU_BAR_SNAPSHOT_SCHEMA_VERSION = 2 as const;

export type PinnedStat = "cpu" | "temperature" | "memory" | "battery" | "network" | "storage" | "none";

export type MenuBarMemory = {
  totalMem: string;
  freeMemPercentage: string;
  freeMem: string;
};

export type NetworkUsage = {
  upload: number;
  download: number;
};

export type SnapshotValue<T> =
  | { status: "fresh"; value: T; collectedAt: number }
  | { status: "cached"; value: T; collectedAt: number; reason: string }
  | { status: "failed"; value?: T; collectedAt?: number; error: string }
  | { status: "unavailable"; reason: string };

export interface MenuBarSnapshot {
  schemaVersion: typeof MENU_BAR_SNAPSHOT_SCHEMA_VERSION;
  collectedAt: number;
  collectionDurationMs: number;
  values: {
    osInfo: SnapshotValue<OSInfo>;
    storage: SnapshotValue<DiskInterface[]>;
    cpuUsage: SnapshotValue<string>;
    memory: SnapshotValue<MenuBarMemory>;
    networkUsage: SnapshotValue<NetworkUsage>;
    batteryData: SnapshotValue<BatteryDataInterface>;
    isOnAC: SnapshotValue<boolean>;
    temperatureData: SnapshotValue<TemperatureData>;
  };
}

export interface MenuBarCollectors {
  cpu: () => Promise<string>;
  backgroundStorage: () => Promise<DiskInterface[]>;
  osInfo: () => Promise<OSInfo>;
  storage: () => Promise<DiskInterface[]>;
  memory: () => Promise<MenuBarMemory>;
  network: () => Promise<NetworkUsage>;
  battery: () => Promise<BatteryDataInterface>;
  temperature: () => Promise<TemperatureData>;
}

export interface CollectMenuBarSnapshotOptions {
  launchType: LaunchType;
  pinnedStat: PinnedStat;
  previous?: MenuBarSnapshot;
  collectors?: MenuBarCollectors;
  now?: () => number;
}

export function snapshotValue<T>(field: SnapshotValue<T> | undefined): T | undefined {
  return field && "value" in field ? field.value : undefined;
}

export function normalizePinnedStat(value: string | undefined): PinnedStat {
  switch (value) {
    case "cpu":
    case "temperature":
    case "memory":
    case "battery":
    case "network":
    case "storage":
    case "none":
      return value;
    default:
      return "none";
  }
}
