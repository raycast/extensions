import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { getOrbitEnv, OrbitUnsupportedCommandError, runOrbit } from "./orbit";
import { isOsTypeEnabled } from "./settings";

const execFileAsync = promisify(execFile);

const appleSimulatorSchema = z.object({
  deviceType: z.literal("simulator"),
  udid: z.string(),
  name: z.string(),
  osType: z.enum(["iOS", "tvOS", "watchOS"]),
  osVersion: z.string().optional(),
  state: z.string(),
  isAvailable: z.boolean().optional(),
  lastBootedAt: z.union([z.string(), z.number()]).optional(),
});

const appleDeviceSchema = z.object({
  deviceType: z.enum(["device", "catalyst"]),
  udid: z.string(),
  name: z.string(),
  model: z.string().optional(),
  osVersion: z.string().optional(),
  connectionType: z.string().optional(),
  developerModeStatus: z.string().optional(),
});

const androidEmulatorSchema = z.object({
  deviceType: z.literal("emulator"),
  name: z.string(),
  state: z.string(),
  pid: z.string().optional(),
});

const androidDeviceSchema = z.object({
  deviceType: z.literal("device"),
  name: z.string(),
  model: z.string().optional(),
  pid: z.string().optional(),
  connectionType: z.string().optional(),
});

const listErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string(),
  helper: z
    .object({
      label: z.string(),
      installUrl: z.string().optional(),
      installCommand: z.string().optional(),
      startCommand: z.string().optional(),
    })
    .optional(),
});

const appleSectionSchema = z.object({
  devices: z.array(z.union([appleSimulatorSchema, appleDeviceSchema])).catch([]),
  error: listErrorSchema.optional().catch(undefined),
});

const androidSectionSchema = z.object({
  devices: z.array(z.union([androidEmulatorSchema, androidDeviceSchema])).catch([]),
  error: listErrorSchema.optional().catch(undefined),
});

const emptySection = { devices: [] };

const listDevicesSchema = z.object({
  ios: appleSectionSchema.catch(emptySection),
  android: androidSectionSchema.catch(emptySection),
  tvos: appleSectionSchema.catch(emptySection),
  watchos: appleSectionSchema.catch(emptySection),
});

export type DeviceListError = z.infer<typeof listErrorSchema>;

/** The platform name the Orbit CLI takes. tvOS and watchOS simulators go through the iOS path. */
export type CliPlatform = "ios" | "android";
export type OsType = "iOS" | "tvOS" | "watchOS" | "Android";
export type DeviceKind = "simulator" | "emulator" | "device";

export type Device = {
  /** The ID the Orbit CLI takes: the UDID for Apple devices, the AVD or device name for Android. */
  id: string;
  name: string;
  platform: CliPlatform;
  osType: OsType;
  kind: DeviceKind;
  isRunning: boolean;
  osVersion?: string;
  model?: string;
  connectionType?: string;
  /** The adb serial of a running emulator or connected Android device, e.g. `emulator-5554`. */
  serial?: string;
  lastBootedAt?: number;
};

export type DeviceList = {
  devices: Device[];
  errors: { platform: "iOS" | "Android"; error: DeviceListError }[];
};

function toTimestamp(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const time = typeof value === "number" ? value : Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

/** Turns an AVD name such as `Pixel_9_Pro_API_35` into `Pixel 9 Pro API 35`. */
export function formatAvdName(name: string): string {
  return name.replace(/_/g, " ");
}

function fromApple(device: z.infer<typeof appleSimulatorSchema> | z.infer<typeof appleDeviceSchema>): Device {
  if (device.deviceType === "simulator") {
    return {
      id: device.udid,
      name: device.name,
      platform: "ios",
      osType: device.osType,
      kind: "simulator",
      isRunning: device.state === "Booted",
      osVersion: device.osVersion,
      lastBootedAt: toTimestamp(device.lastBootedAt),
    };
  }
  return {
    id: device.udid,
    name: device.name,
    platform: "ios",
    osType: "iOS",
    kind: "device",
    isRunning: true,
    osVersion: device.osVersion,
    model: device.model,
    connectionType: device.connectionType,
  };
}

function fromAndroid(device: z.infer<typeof androidEmulatorSchema> | z.infer<typeof androidDeviceSchema>): Device {
  if (device.deviceType === "emulator") {
    return {
      id: device.name,
      name: formatAvdName(device.name),
      platform: "android",
      osType: "Android",
      kind: "emulator",
      isRunning: device.state === "Booted",
      serial: device.pid,
    };
  }
  return {
    id: device.name,
    name: device.name,
    platform: "android",
    osType: "Android",
    kind: "device",
    isRunning: true,
    model: device.model,
    connectionType: device.connectionType,
    serial: device.pid,
  };
}

/** Lists simulators, emulators and connected devices, as Expo Orbit shows them. */
export async function listDevices(): Promise<DeviceList> {
  const output = await runOrbit("list-devices");
  const parsed = listDevicesSchema.parse(JSON.parse(output));

  const appleDevices = [...parsed.ios.devices, ...parsed.tvos.devices, ...parsed.watchos.devices].map(fromApple);
  // With Xcode 27, Expo Orbit before 2.9 also lists every simulator as a connected device.
  const simulatorIds = new Set(appleDevices.filter((device) => device.kind === "simulator").map((device) => device.id));
  const devices = [
    ...appleDevices.filter((device) => device.kind !== "device" || !simulatorIds.has(device.id)),
    ...parsed.android.devices.map(fromAndroid),
  ].filter((device) => isOsTypeEnabled(device.osType));

  const errors: DeviceList["errors"] = [];
  if (parsed.ios.error && isOsTypeEnabled("iOS")) errors.push({ platform: "iOS", error: parsed.ios.error });
  if (parsed.android.error && isOsTypeEnabled("Android"))
    errors.push({ platform: "Android", error: parsed.android.error });

  return { devices, errors };
}

export type BootOptions = { audio?: boolean };

/**
 * Boots a simulator or emulator and brings its window to the front. For a device that already
 * runs, Orbit only brings its window to the front.
 */
export async function bootDevice(device: Device, { audio = true }: BootOptions = {}): Promise<void> {
  const args = ["-p", device.platform, "--id", device.id];
  if (!audio) {
    args.push("--no-audio");
  }
  await runOrbit("boot-device", args);
}

/** Finds `adb` the way Expo Orbit does, including an SDK location set only in Orbit's settings. */
function getAdbPath(env: NodeJS.ProcessEnv): string {
  const sdkRoots = [env.ANDROID_HOME, env.ANDROID_SDK_ROOT, path.join(homedir(), "Library/Android/sdk")];
  for (const root of sdkRoots) {
    if (!root) continue;
    const adb = path.join(root, "platform-tools", "adb");
    if (existsSync(adb)) return adb;
  }
  return "adb";
}

/**
 * Shuts a simulator or emulator down. Uses Orbit's `stop-device` (Orbit 2.9 and later), and the
 * same `simctl` and `adb` calls Orbit makes on older versions.
 */
export async function stopDevice(device: Device): Promise<void> {
  try {
    await runOrbit("stop-device", ["-p", device.platform, "--id", device.id]);
    return;
  } catch (error) {
    if (!(error instanceof OrbitUnsupportedCommandError)) {
      throw error;
    }
  }

  if (device.platform === "ios") {
    await execFileAsync("/usr/bin/xcrun", ["simctl", "shutdown", device.id]);
    return;
  }
  if (!device.serial) {
    throw new Error(`Couldn't find the adb serial of ${device.name}`);
  }
  const env = await getOrbitEnv();
  await execFileAsync(getAdbPath(env), ["-s", device.serial, "emu", "kill"], { env });
}

export function isStoppable(device: Device): boolean {
  return device.kind !== "device" && device.isRunning;
}

export function getDeviceKindLabel(device: Device): string {
  if (device.kind === "device") {
    return device.platform === "android" ? "Android Device" : "Apple Device";
  }
  if (device.kind === "emulator") return "Android Emulator";
  return `${device.osType} Simulator`;
}

/** Sorts running devices first, then by when they last booted, then by name. */
export function sortDevices(devices: Device[]): Device[] {
  return [...devices].sort((a, b) => {
    if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1;
    const bootedA = a.lastBootedAt ?? 0;
    const bootedB = b.lastBootedAt ?? 0;
    if (bootedA !== bootedB) return bootedB - bootedA;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}
