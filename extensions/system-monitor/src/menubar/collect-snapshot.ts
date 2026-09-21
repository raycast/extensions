import { LaunchType } from "@raycast/api";
import { statfs } from "fs/promises";
import { cpus } from "os";

import { DiskInterface } from "../Interfaces";
import { getMemoryUsage } from "../Memory/MemoryUtils";
import { getNetworkData } from "../Network/NetworkUtils";
import { getBatteryData } from "../Power/PowerUtils";
import { calculateDiskStorage, getOSInfo } from "../SystemInfo/SystemUtils";
import { getTemperatureData } from "../Temperature/TemperatureUtils";
import {
  CollectMenuBarSnapshotOptions,
  MenuBarCollectors,
  MenuBarMemory,
  MenuBarSnapshot,
  NetworkUsage,
  SnapshotValue,
  MENU_BAR_SNAPSHOT_SCHEMA_VERSION,
} from "./types";

type NetworkProcesses = Record<string, number[]>;

let previousCpuIdle = 0;
let previousCpuTotal = 0;
let previousNetworkProcesses: NetworkProcesses = {};

for (const core of cpus()) {
  const { user, nice, sys, irq, idle } = core.times;
  previousCpuIdle += idle;
  previousCpuTotal += user + nice + sys + irq + idle;
}

function memorySummary(memTotal: number, memUsed: number): MenuBarMemory {
  const free = Math.max(0, memTotal - memUsed);
  return {
    totalMem: Math.round(memTotal / 1024).toString(),
    freeMemPercentage: memTotal > 0 ? Math.round((free * 100) / memTotal).toString() : "0",
    freeMem: Math.round(free / 1024).toString(),
  };
}

async function collectCpuUsage(): Promise<string> {
  let idle = 0;
  let total = 0;

  for (const core of cpus()) {
    const { user, nice, sys, irq, idle: coreIdle } = core.times;
    idle += coreIdle;
    total += user + nice + sys + irq + coreIdle;
  }

  const idleDelta = idle - previousCpuIdle;
  const totalDelta = total - previousCpuTotal;
  previousCpuIdle = idle;
  previousCpuTotal = total;

  return totalDelta <= 0 ? "0" : Math.round((1 - idleDelta / totalDelta) * 100).toString();
}

async function collectMemoryUsage(): Promise<MenuBarMemory> {
  const memory = await getMemoryUsage();
  return memorySummary(memory.memTotal, memory.memUsed);
}

async function collectBackgroundStorage() {
  const stats = await statfs("/");
  const totalGb = (stats.blocks * stats.bsize) / 1024 / 1024 / 1024;
  const freeGb = (stats.bavail * stats.bsize) / 1024 / 1024 / 1024;

  return [
    {
      diskName: "Macintosh HD",
      totalSize: totalGb.toFixed(2),
      totalAvailableStorage: freeGb.toFixed(2),
      usedStorage: Math.max(0, totalGb - freeGb).toFixed(2),
    },
  ];
}

async function collectNetworkUsage(): Promise<NetworkUsage> {
  const current = await getNetworkData();
  let upload = 0;
  let download = 0;

  for (const key in current) {
    const previous = previousNetworkProcesses[key];
    if (!previous) continue;
    download += Math.max(0, current[key][0] - previous[0]);
    upload += Math.max(0, current[key][1] - previous[1]);
  }

  previousNetworkProcesses = current;
  return { upload, download };
}

export const defaultMenuBarCollectors: MenuBarCollectors = {
  cpu: collectCpuUsage,
  backgroundStorage: collectBackgroundStorage,
  osInfo: getOSInfo,
  storage: calculateDiskStorage,
  memory: collectMemoryUsage,
  network: collectNetworkUsage,
  battery: getBatteryData,
  temperature: getTemperatureData,
};

function previousValue<T>(field: SnapshotValue<T> | undefined, reason: string): SnapshotValue<T> {
  if (field && "value" in field && field.value !== undefined) {
    return {
      status: "cached",
      value: field.value,
      collectedAt: field.collectedAt ?? 0,
      reason,
    };
  }

  return { status: "unavailable", reason };
}

function failureValue<T>(field: SnapshotValue<T> | undefined, error: unknown): SnapshotValue<T> {
  const message = error instanceof Error ? error.message : String(error);
  if (field && "value" in field && field.value !== undefined) {
    return {
      status: "failed",
      value: field.value,
      collectedAt: field.collectedAt,
      error: message,
    };
  }

  return { status: "failed", error: message };
}

async function collectValue<T>(
  collector: () => Promise<T>,
  previous: SnapshotValue<T> | undefined,
  now: () => number,
  validate: (value: T) => boolean = () => true,
): Promise<SnapshotValue<T>> {
  try {
    const value = await collector();
    if (!validate(value)) throw new Error("Collector returned invalid or empty data");
    return { status: "fresh", value, collectedAt: now() };
  } catch (error) {
    return failureValue(previous, error);
  }
}

const validStorage = (storage: DiskInterface[]) => storage.length > 0;
const validCpu = (cpu: string) => Number.isFinite(Number(cpu)) && Number(cpu) >= 0 && Number(cpu) <= 100;
const validMemory = (memory: MenuBarMemory) =>
  Number(memory.totalMem) > 0 &&
  Number(memory.freeMem) >= 0 &&
  Number(memory.freeMemPercentage) >= 0 &&
  Number(memory.freeMemPercentage) <= 100;
const validNetwork = (network: NetworkUsage) =>
  Number.isFinite(network.upload) && network.upload >= 0 && Number.isFinite(network.download) && network.download >= 0;

function mapBatteryPowerState(
  battery: SnapshotValue<Awaited<ReturnType<typeof getBatteryData>>>,
): SnapshotValue<boolean> {
  if (!("value" in battery) || battery.value === undefined) {
    return battery.status === "failed"
      ? { status: "failed", error: battery.error }
      : { status: "unavailable", reason: "Battery data is unavailable" };
  }

  const value = battery.value.isOnAcPower ?? (!battery.value.isCharging && battery.value.fullyCharged);
  if (battery.status === "fresh") {
    return { status: "fresh", value, collectedAt: battery.collectedAt };
  }
  if (battery.status === "cached") {
    return { status: "cached", value, collectedAt: battery.collectedAt, reason: battery.reason };
  }
  return { status: "failed", value, collectedAt: battery.collectedAt, error: battery.error };
}

const BACKGROUND_SKIP_REASON = "External collectors are skipped during background refresh";
const BACKGROUND_MEMORY_REASON = "Memory updates when the menu is opened";

/**
 * Select and run menu-bar collectors without reading Raycast UI state or writing cache data.
 * Background launches run only bounded, in-process collectors for the configured title.
 */
export async function collectMenuBarSnapshot({
  launchType,
  pinnedStat,
  previous,
  collectors = defaultMenuBarCollectors,
  now = Date.now,
}: CollectMenuBarSnapshotOptions): Promise<MenuBarSnapshot> {
  const startedAt = now();

  if (launchType === LaunchType.Background) {
    const values: MenuBarSnapshot["values"] = {
      osInfo: previousValue(previous?.values.osInfo, BACKGROUND_SKIP_REASON),
      storage: previousValue(previous?.values.storage, BACKGROUND_SKIP_REASON),
      cpuUsage: previousValue(previous?.values.cpuUsage, BACKGROUND_SKIP_REASON),
      memory: previousValue(previous?.values.memory, BACKGROUND_MEMORY_REASON),
      networkUsage: previousValue(previous?.values.networkUsage, BACKGROUND_SKIP_REASON),
      batteryData: previousValue(previous?.values.batteryData, BACKGROUND_SKIP_REASON),
      isOnAC: previousValue(previous?.values.isOnAC, BACKGROUND_SKIP_REASON),
      temperatureData: previousValue(previous?.values.temperatureData, BACKGROUND_SKIP_REASON),
    };

    if (pinnedStat === "cpu") {
      values.cpuUsage = await collectValue(collectors.cpu, previous?.values.cpuUsage, now, validCpu);
    } else if (pinnedStat === "storage") {
      values.storage = await collectValue(collectors.backgroundStorage, previous?.values.storage, now, validStorage);
    }

    const finishedAt = now();
    return {
      schemaVersion: MENU_BAR_SNAPSHOT_SCHEMA_VERSION,
      collectedAt: finishedAt,
      collectionDurationMs: Math.max(0, finishedAt - startedAt),
      values,
    };
  }

  const [osInfo, storage, cpuUsage, memory, networkUsage, batteryData, temperatureData] = await Promise.all([
    collectValue(collectors.osInfo, previous?.values.osInfo, now),
    collectValue(collectors.storage, previous?.values.storage, now, validStorage),
    collectValue(collectors.cpu, previous?.values.cpuUsage, now, validCpu),
    collectValue(collectors.memory, previous?.values.memory, now, validMemory),
    collectValue(collectors.network, previous?.values.networkUsage, now, validNetwork),
    collectValue(collectors.battery, previous?.values.batteryData, now),
    collectValue(collectors.temperature, previous?.values.temperatureData, now),
  ]);
  const finishedAt = now();

  return {
    schemaVersion: MENU_BAR_SNAPSHOT_SCHEMA_VERSION,
    collectedAt: finishedAt,
    collectionDurationMs: Math.max(0, finishedAt - startedAt),
    values: {
      osInfo,
      storage,
      cpuUsage,
      memory,
      networkUsage,
      batteryData,
      isOnAC: mapBatteryPowerState(batteryData),
      temperatureData,
    },
  };
}
