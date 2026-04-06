import { exec } from "child_process";
import { promisify } from "util";
import plist from "plist";

const execp = promisify(exec);

export interface MacBattery {
  kind: "mac";
  name: string;
  percentage: number;
  isCharging: boolean;
  isFullyCharged: boolean;
  isConnected: boolean;
  chargingStatus:
    | "charging"
    | "discharging"
    | "fully charged"
    | "on hold"
    | "unknown";
  cycleCount: number;
  health: number;
  designCapacity: number;
  maxCapacity: number;
  currentCharge: number;
  voltage: number;
  amperage: number;
  watts: number | null;
  temperature: number;
  timeRemaining: number | null;
  hoursRemaining: number | null;
  minutesRemaining: number | null;
  isLowPowerMode: boolean;
  adapterName: string | null;
  adapterWatts: number | null;
  serial: string | null;
}

export interface BluetoothDevice {
  kind: "bluetooth";
  name: string;
  deviceType: string;
  isConnected: boolean;
  isLikelyCharging: boolean;
  batteryLevel: number | null;
  batteryLeft: number | null;
  batteryRight: number | null;
  batteryCase: number | null;
  vendorId: string;
  address: string;
}

export type DeviceInfo = MacBattery | BluetoothDevice;

export interface AllDevices {
  mac: MacBattery;
  bluetooth: BluetoothDevice[];
}

function parseBatteryPercent(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value.replace("%", ""), 10);
  return isNaN(num) ? null : num;
}

async function getMacModel(): Promise<string> {
  try {
    const { stdout } = await execp("sysctl -n hw.model");
    const model = stdout.trim();
    if (model.startsWith("MacBookPro")) return "MacBook Pro";
    if (model.startsWith("MacBookAir")) return "MacBook Air";
    if (model.startsWith("MacBook")) return "MacBook";
    if (model.startsWith("iMac")) return "iMac";
    if (model.startsWith("Macmini")) return "Mac mini";
    if (model.startsWith("MacPro")) return "Mac Pro";
    if (model.startsWith("Mac")) return "Mac Studio";
    return "Mac";
  } catch {
    return "Mac";
  }
}

async function getMacBattery(): Promise<MacBattery> {
  const [ioregResult, pmsetResult, modelName] = await Promise.all([
    execp("/usr/sbin/ioreg -arn AppleSmartBattery"),
    execp("/usr/bin/pmset -g"),
    getMacModel(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [batt] = plist.parse(ioregResult.stdout.trim()) as any[];
  const isLowPowerMode = /lowpowermode\s+1/i.test(
    pmsetResult.stdout.toLowerCase(),
  );

  const voltage: number = batt.Voltage ?? 0;
  const amperage: number = batt.Amperage ?? 0;
  const isConnected: boolean = batt.ExternalConnected === true;
  const isCharging: boolean = batt.IsCharging === true;
  const isFullyCharged: boolean = batt.FullyCharged === true;

  const validPowerDirection = isConnected ? amperage > 0 : amperage < 0;
  const rawTimeRemaining: number | null =
    validPowerDirection && batt.TimeRemaining < 65535
      ? batt.TimeRemaining
      : null;

  const designCapacity: number = batt.DesignCapacity ?? 0;
  const maxCapacity: number = batt.AppleRawMaxCapacity ?? batt.MaxCapacity ?? 0;
  const currentCharge: number =
    batt.AppleRawCurrentCapacity ?? batt.CurrentCapacity ?? 0;

  const watts =
    rawTimeRemaining !== null && voltage && amperage
      ? (voltage / 1000) * (amperage / 1000)
      : null;

  let chargingStatus: MacBattery["chargingStatus"];
  if (isFullyCharged) {
    chargingStatus = "fully charged";
  } else if (isConnected && !isCharging) {
    chargingStatus = "on hold";
  } else if (isCharging) {
    chargingStatus = "charging";
  } else if (!isConnected) {
    chargingStatus = "discharging";
  } else {
    chargingStatus = "unknown";
  }

  const adapter = batt.AdapterDetails;

  return {
    kind: "mac",
    name: modelName,
    percentage: batt.CurrentCapacity ?? 0,
    isCharging,
    isFullyCharged,
    isConnected,
    chargingStatus,
    cycleCount: batt.CycleCount ?? 0,
    health: designCapacity > 0 ? (maxCapacity / designCapacity) * 100 : 0,
    designCapacity,
    maxCapacity,
    currentCharge,
    voltage,
    amperage,
    watts,
    temperature: batt.Temperature ? batt.Temperature / 100 : 0,
    timeRemaining: rawTimeRemaining,
    hoursRemaining:
      rawTimeRemaining !== null ? Math.floor(rawTimeRemaining / 60) : null,
    minutesRemaining: rawTimeRemaining !== null ? rawTimeRemaining % 60 : null,
    isLowPowerMode,
    adapterName: adapter?.Name ?? null,
    adapterWatts: adapter?.Watts ?? null,
    serial: batt.BatterySerialNumber ?? batt.Serial ?? null,
  };
}

async function getBluetoothDevices(): Promise<BluetoothDevice[]> {
  try {
    const { stdout } = await execp(
      "/usr/sbin/system_profiler SPBluetoothDataType -xml",
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = plist.parse(stdout.trim()) as any[];
    const items = parsed[0]?._items?.[0];
    if (!items) return [];

    const devices: BluetoothDevice[] = [];

    for (const groupKey of [
      "device_connected",
      "device_not_connected",
    ] as const) {
      const isConnected = groupKey === "device_connected";
      const group = items[groupKey];
      if (!Array.isArray(group)) continue;

      for (const entry of group) {
        for (const [name, info] of Object.entries(entry)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dev = info as any;
          const batteryLevel = parseBatteryPercent(dev.device_batteryLevel);
          const batteryLeft = parseBatteryPercent(dev.device_batteryLevelLeft);
          const batteryRight = parseBatteryPercent(
            dev.device_batteryLevelRight,
          );
          const batteryCase = parseBatteryPercent(dev.device_batteryLevelCase);

          const hasBattery =
            batteryLevel !== null ||
            batteryLeft !== null ||
            batteryRight !== null ||
            batteryCase !== null;

          if (!hasBattery && !isConnected) continue;

          const isAirPods =
            (dev.device_minorType ?? "").toLowerCase() === "headphones" &&
            (dev.device_vendorID ?? "").includes("004C");
          const isLikelyCharging =
            isAirPods && !isConnected && batteryCase !== null;

          devices.push({
            kind: "bluetooth",
            name,
            deviceType: dev.device_minorType ?? "Unknown",
            isConnected,
            isLikelyCharging,
            batteryLevel,
            batteryLeft,
            batteryRight,
            batteryCase,
            vendorId: dev.device_vendorID ?? "",
            address: dev.device_address ?? "",
          });
        }
      }
    }

    return devices;
  } catch (err) {
    console.error("Failed to fetch Bluetooth devices:", err);
    return [];
  }
}

export async function getAllDevices(): Promise<AllDevices> {
  const [mac, bluetooth] = await Promise.all([
    getMacBattery(),
    getBluetoothDevices(),
  ]);
  return { mac, bluetooth };
}

export function formatTime(
  hours: number | null,
  minutes: number | null,
): string {
  if (hours === null || minutes === null) return "--:--";
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatTemperature(celsius: number, unit: string): string {
  if (unit === "fahrenheit") {
    return `${((celsius * 9) / 5 + 32).toFixed(1)} F`;
  }
  return `${celsius.toFixed(1)} C`;
}

export function formatWatts(watts: number | null): string {
  if (watts === null) return "--";
  return `${Math.abs(Math.round(watts * 10) / 10)} W`;
}

export function getChargingStatusLabel(
  status: MacBattery["chargingStatus"],
): string {
  const labels: Record<MacBattery["chargingStatus"], string> = {
    charging: "Charging",
    discharging: "On Battery",
    "fully charged": "Fully Charged",
    "on hold": "Charging On Hold",
    unknown: "Unknown",
  };
  return labels[status];
}

export function getConditionLabel(health: number): string {
  if (health >= 80) return "Normal";
  if (health >= 60) return "Service Recommended";
  return "Service Required";
}

export function getDeviceIcon(device: BluetoothDevice): string {
  const type = device.deviceType.toLowerCase();
  const nameLower = device.name.toLowerCase();

  if (nameLower.includes("airpods")) return "headphones";
  if (nameLower.includes("iphone")) return "iphone";
  if (nameLower.includes("ipad")) return "ipad";
  if (nameLower.includes("apple watch") || nameLower.includes("watch"))
    return "watch";
  if (type === "headphones" || type === "headset") return "headphones";
  if (type === "mouse") return "mouse";
  if (type === "keyboard") return "keyboard";
  return "bluetooth";
}

export function hasAirPodsComponents(device: BluetoothDevice): boolean {
  return (
    (device.batteryLeft !== null || device.batteryRight !== null) &&
    device.batteryCase !== null
  );
}

export function getPrimaryBattery(device: BluetoothDevice): number | null {
  if (device.batteryLevel !== null) return device.batteryLevel;
  const levels = [device.batteryLeft, device.batteryRight].filter(
    (l): l is number => l !== null,
  );
  if (levels.length > 0) return Math.min(...levels);
  return device.batteryCase;
}
