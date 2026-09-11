import plist, { PlistArray, PlistObject } from "plist";
import { Cache } from "@raycast/api";
import { BatteryDataInterface } from "../Interfaces";
import { execTail, execf } from "../utils";
import { parseTimeOnBatteryFromPmsetLog } from "../lib/power-battery-time";

const cache = new Cache();
const CONDITION_KEY = "battery-condition-v2";
const CONDITION_TTL_MS = 24 * 60 * 60 * 1000;

function readCachedCondition(): string | undefined {
  const raw = cache.get(CONDITION_KEY);
  if (!raw) {
    return undefined;
  }

  const separator = raw.lastIndexOf("|");
  if (separator === -1) {
    return undefined;
  }

  const timestamp = Number(raw.slice(separator + 1));
  if (!Number.isFinite(timestamp) || Date.now() - timestamp >= CONDITION_TTL_MS) {
    return undefined;
  }

  return raw.slice(0, separator);
}

function readBatteryTemperature(smartBattery: PlistObject): string {
  const batteryData = smartBattery.BatteryData as PlistObject | undefined;
  const tempRaw = (batteryData?.Temperature ?? smartBattery.Temperature) as number | undefined;

  if (tempRaw == null || Number.isNaN(tempRaw)) {
    return "N/A";
  }

  return `${(tempRaw / 100).toFixed(1)} °C`;
}

function readMaximumCapacity(smartBattery: PlistObject, cachedCapacity: string | undefined): string {
  const batteryData = smartBattery.BatteryData as PlistObject | undefined;
  const designCapacity = batteryData?.DesignCapacity as number | undefined;
  // AppleRawMaxCapacity disappeared from BatteryData on newer macOS;
  // NominalChargeCapacity is what the OS Battery settings pane derives from.
  const maxCapacity = (batteryData?.AppleRawMaxCapacity ??
    batteryData?.NominalChargeCapacity ??
    batteryData?.FullChargeCapacity) as number | undefined;

  if (designCapacity && maxCapacity) {
    return `${Math.round((maxCapacity / designCapacity) * 100)}%`;
  }

  return cachedCapacity ?? "Unknown";
}

export const getBatteryData = async (): Promise<BatteryDataInterface> => {
  const [smartBatteryOutput, pmsetOutput] = await Promise.all([
    execf("/usr/sbin/ioreg", ["-arn", "AppleSmartBattery"]),
    execf("/usr/bin/pmset", ["-g", "batt"]),
  ]);

  const smartBattery = (plist.parse(smartBatteryOutput) as PlistArray)[0] as PlistObject;

  const batteryLevelMatch = pmsetOutput.match(/(\d+)%/);
  const batteryLevel = batteryLevelMatch?.[1] ?? "N/A";
  const isOnAcPower = pmsetOutput.includes("AC Power") || pmsetOutput.includes("AC attached");

  let condition = readCachedCondition();
  if (!condition) {
    try {
      const output = await execf("/usr/sbin/system_profiler", ["SPPowerDataType"]);
      const condMatch = output.match(/Condition:\s*(.+)/);
      condition = condMatch ? condMatch[1].trim() : "Normal";
      cache.set(CONDITION_KEY, `${condition}|${Date.now()}`);
    } catch {
      condition = "Unknown";
    }
  }

  const cachedCapacity = cache.get("battery-max-capacity") ?? undefined;
  const maximumCapacity = readMaximumCapacity(smartBattery, cachedCapacity);
  if (maximumCapacity !== "Unknown") {
    cache.set("battery-max-capacity", maximumCapacity);
  }

  return {
    batteryLevel,
    condition,
    cycleCount: smartBattery.CycleCount?.toString() ?? "Unknown",
    fullyCharged: !!smartBattery.FullyCharged,
    isCharging: !!smartBattery.IsCharging,
    temperature: readBatteryTemperature(smartBattery),
    timeRemaining: smartBattery.TimeRemaining as number,
    maximumCapacity,
    isOnAcPower,
  };
};

export const getTimeOnBattery = async (): Promise<string> => {
  try {
    // The log's tail is dominated by assertion dumps and sleep/wake blocks;
    // power-source summary lines can sit hundreds of lines back, so keep a
    // generous window or the parser never sees a "Using Batt"/"Using AC" line.
    const logOutput = await execTail("/usr/bin/pmset", ["-g", "log"], 5000);
    return parseTimeOnBatteryFromPmsetLog(logOutput);
  } catch {
    return "N/A";
  }
};

export const hasBattery = async (): Promise<boolean> => {
  try {
    const output = await execf("/usr/sbin/ioreg", ["-arn", "AppleSmartBattery"]);
    return output.length > 0;
  } catch {
    return false;
  }
};
