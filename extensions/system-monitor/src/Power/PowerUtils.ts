import plist, { PlistArray, PlistObject } from "plist";
import { Cache } from "@raycast/api";
import { BatteryDataInterface } from "../Interfaces";
import { convertMsToTime, execf } from "../utils";

const cache = new Cache();
const CONDITION_KEY = "battery-condition";
const CAPACITY_KEY = "battery-max-capacity";

export const getBatteryData = async (): Promise<BatteryDataInterface> => {
  const [smartBatteryOutput, pmsetOutput] = await Promise.all([
    execf("/usr/sbin/ioreg", ["-arn", "AppleSmartBattery"]),
    execf("/usr/bin/pmset", ["-g", "batt"]),
  ]);

  const smartBattery = (plist.parse(smartBatteryOutput) as PlistArray)[0] as PlistObject;

  const batteryLevelMatch = pmsetOutput.match(/(\d+)%/);
  const batteryLevel = batteryLevelMatch ? batteryLevelMatch[1] : "0";

  // Condition & Maximum Capacity rarely change. Fetch system_profiler only
  // when not cached, and await it so the child process is properly reaped.
  let condition = cache.get(CONDITION_KEY);
  let maximumCapacity = cache.get(CAPACITY_KEY);
  if (!condition || !maximumCapacity) {
    try {
      const output = await execf("/usr/sbin/system_profiler", ["SPPowerDataType"]);
      const condMatch = output.match(/Condition:\s*(.+)/);
      const capMatch = output.match(/Maximum Capacity:\s*(.+)/);
      condition = condMatch ? condMatch[1].trim() : "Normal";
      maximumCapacity = capMatch ? capMatch[1].trim() : "Unknown";
      cache.set(CONDITION_KEY, condition);
      cache.set(CAPACITY_KEY, maximumCapacity);
    } catch {
      condition = condition ?? "Unknown";
      maximumCapacity = maximumCapacity ?? "Unknown";
    }
  }

  return {
    batteryLevel,
    condition,
    cycleCount: smartBattery.CycleCount.toString(),
    fullyCharged: !!smartBattery.FullyCharged,
    isCharging: !!smartBattery.IsCharging,
    temperature: `${Math.fround((smartBattery.Temperature as number) / 100).toFixed(2)} ºC`,
    timeRemaining: smartBattery.TimeRemaining as number,
    maximumCapacity,
  };
};

export const getTimeOnBattery = async (): Promise<string> => {
  const logOutput = await execf("/usr/bin/pmset", ["-g", "log"], 10 * 1024 * 1024);
  const lines = logOutput.split("\n");
  let lastACLine = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes("Using AC")) {
      lastACLine = lines[i];
      break;
    }
  }
  const dateStr = lastACLine.split(/\s+/).slice(0, 3).join(" ");
  const startTime = new Date(Date.parse(dateStr));
  const endTime = new Date();

  return convertMsToTime(endTime.valueOf() - startTime.valueOf());
};

export const hasBattery = async (): Promise<boolean> => {
  const output = await execf("/usr/sbin/ioreg", ["-arn", "AppleSmartBattery"]);

  return !!output;
};
