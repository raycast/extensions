import { Cache } from "@raycast/api";

import { BatteryDataInterface, DiskInterface } from "../Interfaces";
import { OSInfo } from "../lib/os-version";
import { TemperatureData } from "../Temperature/TemperatureUtils";
import { MENU_BAR_SNAPSHOT_SCHEMA_VERSION, MenuBarMemory, MenuBarSnapshot, NetworkUsage, SnapshotValue } from "./types";

export const MENU_BAR_SNAPSHOT_CACHE_KEY = "menubar-snapshot-v2";
export const PREVIOUS_MENU_BAR_SNAPSHOT_CACHE_KEY = "menubar-snapshot-v1";
export const LEGACY_MENU_BAR_CACHE_KEY = "menubar-data";
export const MAX_MENU_BAR_SNAPSHOT_BYTES = 64 * 1024;

export interface SnapshotCache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove?(key: string): boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isShortString = (value: unknown, max = 1_024): value is string =>
  typeof value === "string" && value.length <= max;
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isNumericString = (value: unknown): value is string =>
  isShortString(value, 64) && value.trim().length > 0 && Number.isFinite(Number(value));

function isOSInfo(value: unknown): value is OSInfo {
  return isRecord(value) && isShortString(value.release) && isShortString(value.build) && isShortString(value.display);
}

function isDisk(value: unknown): value is DiskInterface {
  return (
    isRecord(value) &&
    isShortString(value.diskName) &&
    isNumericString(value.totalSize) &&
    isNumericString(value.totalAvailableStorage) &&
    isNumericString(value.usedStorage)
  );
}

function isStorage(value: unknown): value is DiskInterface[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 32 && value.every(isDisk);
}

function isCpuUsage(value: unknown): value is string {
  return isNumericString(value) && Number(value) >= 0 && Number(value) <= 100;
}

function isMemory(value: unknown): value is MenuBarMemory {
  return (
    isRecord(value) &&
    isNumericString(value.totalMem) &&
    isNumericString(value.freeMemPercentage) &&
    isNumericString(value.freeMem) &&
    Number(value.freeMemPercentage) >= 0 &&
    Number(value.freeMemPercentage) <= 100
  );
}

function isNetworkUsage(value: unknown): value is NetworkUsage {
  return (
    isRecord(value) &&
    isFiniteNumber(value.upload) &&
    value.upload >= 0 &&
    isFiniteNumber(value.download) &&
    value.download >= 0
  );
}

function isBatteryData(value: unknown): value is BatteryDataInterface {
  return (
    isRecord(value) &&
    isShortString(value.condition) &&
    isShortString(value.cycleCount) &&
    isShortString(value.batteryLevel) &&
    isBoolean(value.fullyCharged) &&
    isBoolean(value.isCharging) &&
    isBoolean(value.isOnAcPower) &&
    isShortString(value.maximumCapacity) &&
    isShortString(value.temperature) &&
    isFiniteNumber(value.timeRemaining)
  );
}

function isTemperatureData(value: unknown): value is TemperatureData {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.cpuAverage) ||
    !isFiniteNumber(value.cpuMax) ||
    !isFiniteNumber(value.gpuAverage) ||
    !isBoolean(value.isAppleSilicon) ||
    !isBoolean(value.sensorAvailable) ||
    !isShortString(value.chipModel) ||
    !isFiniteNumber(value.coreCount) ||
    !isFiniteNumber(value.dieSensorCount) ||
    !Array.isArray(value.sensors) ||
    value.sensors.length > 64
  ) {
    return false;
  }

  return value.sensors.every(
    (sensor) =>
      isRecord(sensor) &&
      isShortString(sensor.name) &&
      isShortString(sensor.label) &&
      isFiniteNumber(sensor.temperature),
  );
}

function isTimestamp(value: unknown, now: number): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= now + 5 * 60 * 1_000;
}

function isSnapshotValue<T>(
  value: unknown,
  validateValue: (candidate: unknown) => candidate is T,
  now: number,
): value is SnapshotValue<T> {
  if (!isRecord(value) || typeof value.status !== "string") return false;

  switch (value.status) {
    case "fresh":
      return validateValue(value.value) && isTimestamp(value.collectedAt, now);
    case "cached":
      return validateValue(value.value) && isTimestamp(value.collectedAt, now) && isShortString(value.reason);
    case "failed":
      return (
        isShortString(value.error) &&
        (value.value === undefined || validateValue(value.value)) &&
        (value.collectedAt === undefined || isTimestamp(value.collectedAt, now))
      );
    case "unavailable":
      return isShortString(value.reason);
    default:
      return false;
  }
}

export function parseMenuBarSnapshot(raw: string, now = Date.now()): MenuBarSnapshot | undefined {
  if (Buffer.byteLength(raw, "utf8") > MAX_MENU_BAR_SNAPSHOT_BYTES) return undefined;

  try {
    const snapshot: unknown = JSON.parse(raw);
    if (
      !isRecord(snapshot) ||
      snapshot.schemaVersion !== MENU_BAR_SNAPSHOT_SCHEMA_VERSION ||
      !isTimestamp(snapshot.collectedAt, now) ||
      !isFiniteNumber(snapshot.collectionDurationMs) ||
      snapshot.collectionDurationMs < 0 ||
      snapshot.collectionDurationMs > 60_000 ||
      !isRecord(snapshot.values)
    ) {
      return undefined;
    }

    const values = snapshot.values;
    if (
      !isSnapshotValue(values.osInfo, isOSInfo, now) ||
      !isSnapshotValue(values.storage, isStorage, now) ||
      !isSnapshotValue(values.cpuUsage, isCpuUsage, now) ||
      !isSnapshotValue(values.memory, isMemory, now) ||
      !isSnapshotValue(values.networkUsage, isNetworkUsage, now) ||
      !isSnapshotValue(values.batteryData, isBatteryData, now) ||
      !isSnapshotValue(values.isOnAC, isBoolean, now) ||
      !isSnapshotValue(values.temperatureData, isTemperatureData, now)
    ) {
      return undefined;
    }

    return snapshot as unknown as MenuBarSnapshot;
  } catch {
    return undefined;
  }
}

export function readMenuBarSnapshot(cache: SnapshotCache = new Cache()): MenuBarSnapshot | undefined {
  const raw = cache.get(MENU_BAR_SNAPSHOT_CACHE_KEY);
  return raw ? parseMenuBarSnapshot(raw) : undefined;
}

export function removeLegacyMenuBarCache(cache: SnapshotCache): void {
  for (const key of [LEGACY_MENU_BAR_CACHE_KEY, PREVIOUS_MENU_BAR_SNAPSHOT_CACHE_KEY]) {
    if (cache.remove && cache.get(key) !== undefined) {
      cache.remove(key);
    }
  }
}

export function writeMenuBarSnapshot(snapshot: MenuBarSnapshot, cache: SnapshotCache = new Cache()): boolean {
  const fields = Object.values(snapshot.values);
  if (!fields.some((field) => field.status === "fresh")) return false;

  let serialized: string;
  try {
    serialized = JSON.stringify(snapshot);
  } catch {
    return false;
  }
  if (!parseMenuBarSnapshot(serialized, Math.max(Date.now(), snapshot.collectedAt))) return false;

  try {
    cache.set(MENU_BAR_SNAPSHOT_CACHE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
