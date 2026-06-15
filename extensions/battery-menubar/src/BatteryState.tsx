import { parse } from "plist";
import { execp } from ".";

export interface BluetoothBatteryDevice {
  name: string;
  address: string;
  type: string;
  isConnected: boolean;
  batteryLevel: number | null;
  batteryLeft: number | null;
  batteryRight: number | null;
  batteryCase: number | null;
}

function parseBatteryPercent(value: unknown): number | null {
  if (value == null) return null;
  const normalized = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized.replace("%", ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export const getBatteryState = async () => {
  const [ioregOutput, pmsetOutput] = await Promise.all([
    execp("/usr/sbin/ioreg -arn AppleSmartBattery").then((r) => r.stdout.trim()),
    execp("/usr/bin/pmset -g").then((r) => r.stdout.trim()),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const battList = parse(ioregOutput) as any[];
  const [batt] = battList;
  const isLowPowerMode = /lowpowermode\s+1/i.test(pmsetOutput.toLowerCase().trim());

  // Desktop Macs do not expose AppleSmartBattery and return an empty array.
  const voltage = batt?.Voltage ?? null;
  const amperage = batt?.Amperage ?? null;
  const connected = batt?.ExternalConnected ?? null;
  const validPowerDirection = connected ? amperage > 0 : amperage < 0;
  const timeRemaining = validPowerDirection && batt?.TimeRemaining < 65535 ? batt.TimeRemaining : null;
  const capacity = batt?.CurrentCapacity ? batt.CurrentCapacity / 100 : null;
  const cycles = batt?.CycleCount ?? null;
  const health =
    batt?.AppleRawMaxCapacity && batt?.DesignCapacity ? (batt.AppleRawMaxCapacity / batt.DesignCapacity) * 100 : null;
  const watts = voltage != null && amperage != null ? (voltage / 1000) * (amperage / 1000) : null;
  const temperature = batt?.Temperature ?? null;

  const isCharging = batt?.IsCharging === true || batt?.IsCharging === "Yes";
  const isFullyCharged = batt?.FullyCharged === true || batt?.FullyCharged === "Yes";

  let chargingStatus: "on hold" | "fully charged" | "charging" | "discharging" | "unknown";

  if (isFullyCharged) {
    chargingStatus = "fully charged";
  } else if (connected === true && !isCharging) {
    chargingStatus = "on hold";
  } else if (isCharging) {
    chargingStatus = "charging";
  } else if (connected === false) {
    chargingStatus = "discharging";
  } else {
    chargingStatus = "unknown";
  }

  const state = {
    time: Date.now(),
    capacity,
    voltage,
    amperage,
    watts,
    timeRemaining: timeRemaining,
    hoursRemaining: timeRemaining != null ? Math.floor(timeRemaining / 60) : null,
    minutesRemaining: timeRemaining != null ? timeRemaining % 60 : null,
    temperature,
    connected,
    isCharging, // New: Actual charging status
    isFullyCharged, // New: Whether fully charged
    chargingStatus, // New: Charging status string
    cycles,
    health,
    lowPowerMode: isLowPowerMode,
  };
  return state;
};
export type BatteryState = Awaited<ReturnType<typeof getBatteryState>>;

export const getBluetoothBatteryDevices = async (): Promise<BluetoothBatteryDevice[]> => {
  try {
    const profilerOutput = await execp("/usr/sbin/system_profiler SPBluetoothDataType -xml").then((r) =>
      r.stdout.trim(),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = parse(profilerOutput) as any[];
    const items = parsed?.[0]?._items?.[0];
    if (!items) return [];

    const devices: BluetoothBatteryDevice[] = [];

    for (const groupKey of ["device_connected", "device_not_connected"] as const) {
      const group = items[groupKey];
      if (!Array.isArray(group)) continue;

      for (const entry of group) {
        for (const [name, deviceInfo] of Object.entries(entry)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const info = deviceInfo as any;
          const batteryLevel = parseBatteryPercent(info.device_batteryLevel);
          const batteryLevelMain = parseBatteryPercent(info.device_batteryLevelMain);
          const batteryLeft = parseBatteryPercent(info.device_batteryLevelLeft);
          const batteryRight = parseBatteryPercent(info.device_batteryLevelRight);
          const batteryCase = parseBatteryPercent(info.device_batteryLevelCase);
          const hasBatteryData =
            batteryLevel != null ||
            batteryLevelMain != null ||
            batteryLeft != null ||
            batteryRight != null ||
            batteryCase != null;
          const lowerType = String(info.device_minorType ?? "").toLowerCase();
          const isInputPeripheral =
            lowerType.includes("mouse") || lowerType.includes("keyboard") || lowerType.includes("trackpad");

          if (!hasBatteryData && !(groupKey === "device_connected" && isInputPeripheral)) continue;

          devices.push({
            name,
            address: info.device_address ?? name,
            type: (info.device_minorType ?? "Unknown") as string,
            isConnected: groupKey === "device_connected",
            batteryLevel: batteryLevel ?? batteryLevelMain,
            batteryLeft,
            batteryRight,
            batteryCase,
          });
        }
      }
    }

    return devices;
  } catch {
    return [];
  }
};
