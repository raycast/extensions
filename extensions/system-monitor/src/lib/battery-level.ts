export type BatteryDisplayMode = "free" | "used";

export function parseBatteryLevelPercent(batteryLevel: string | undefined): number | null {
  if (!batteryLevel || !/^\d{1,3}$/.test(batteryLevel.trim())) {
    return null;
  }

  const parsed = parseInt(batteryLevel, 10);
  return parsed >= 0 && parsed <= 100 ? parsed : null;
}

/** The charge percentage as the user asked to see it: remaining charge, or how much has been used. */
export function batteryDisplayPercent(batteryLevel: string | undefined, mode: BatteryDisplayMode): number | null {
  const percent = parseBatteryLevelPercent(batteryLevel);
  if (percent === null) {
    return null;
  }

  return mode === "free" ? percent : 100 - percent;
}
