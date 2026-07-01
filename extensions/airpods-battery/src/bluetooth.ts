import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SYSTEM_PROFILER_PATH = "/usr/sbin/system_profiler";
const BATTERY_FIELD_CANDIDATES = {
  left: ["device_batteryLevelLeft", "batteryLevelLeft", "battery_left"],
  right: ["device_batteryLevelRight", "batteryLevelRight", "battery_right"],
  case: ["device_batteryLevelCase", "batteryLevelCase", "battery_case", "device_batteryLevel"],
} as const;

export type AirPodsBattery = {
  name: string;
  left?: string;
  right?: string;
  case?: string;
  updatedAt: string;
};

export type AirPodsBatteryResult =
  | { status: "connected"; battery: AirPodsBattery; warnings: string[] }
  | { status: "not-connected"; message: string }
  | { status: "error"; message: string };

type BluetoothReport = {
  SPBluetoothDataType?: BluetoothSection[];
};

type BluetoothSection = {
  device_connected?: BluetoothDeviceEntry[];
};

type BluetoothDeviceEntry = Record<string, Record<string, unknown>>;

export async function readAirPodsBattery(): Promise<AirPodsBatteryResult> {
  try {
    const { stdout } = await execFileAsync(
      SYSTEM_PROFILER_PATH,
      ["SPBluetoothDataType", "-json", "-timeout", "10"],
      { timeout: 12_000, maxBuffer: 1024 * 1024 },
    );

    return parseAirPodsBatteryReport(stdout);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to read Bluetooth data.",
    };
  }
}

export function parseAirPodsBatteryReport(rawReport: string): AirPodsBatteryResult {
  let report: BluetoothReport;

  try {
    report = JSON.parse(rawReport) as BluetoothReport;
  } catch {
    return { status: "error", message: "Bluetooth data was not valid JSON." };
  }

  const connectedDevices =
    report.SPBluetoothDataType?.flatMap((section) => section.device_connected ?? []) ?? [];

  for (const entry of connectedDevices) {
    for (const [name, properties] of Object.entries(entry)) {
      if (!name.toLowerCase().includes("airpods")) {
        continue;
      }

      const battery = {
        name,
        left: readBatteryField(properties, BATTERY_FIELD_CANDIDATES.left),
        right: readBatteryField(properties, BATTERY_FIELD_CANDIDATES.right),
        case: readBatteryField(properties, BATTERY_FIELD_CANDIDATES.case),
        updatedAt: new Date().toISOString(),
      };

      const warnings = [
        battery.left ? undefined : "Left AirPod battery unavailable",
        battery.right ? undefined : "Right AirPod battery unavailable",
      ].filter((warning): warning is string => Boolean(warning));

      return { status: "connected", battery, warnings };
    }
  }

  return {
    status: "not-connected",
    message: "No connected AirPods were found.",
  };
}

function readBatteryField(
  properties: Record<string, unknown>,
  candidates: readonly string[],
): string | undefined {
  for (const field of candidates) {
    const value = properties[field];
    const normalized = normalizeBatteryValue(value);

    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function normalizeBatteryValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}%`;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
}
