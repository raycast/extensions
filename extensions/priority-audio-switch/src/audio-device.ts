// Audio devices on macOS, through two command-line tools in assets/ (copied to the support folder before use):
// - audio-devices: the npm package @spotxyz/macos-audio-devices (MIT). Lists devices and sets the default ones.
// - sound-control: built from swift/sound-control.swift. Volume and mute.
import { environment, getPreferenceValues } from "@raycast/api";
import { execa } from "execa";
import fs from "fs";
import path from "path";

export type IOType = "input" | "output";

export type AudioDevice = {
  /** Core Audio object ID; changes when the device reconnects. */
  id: string;
  /** Persistent device UID; stable across reconnects for most devices. */
  uid: string;
  name: string;
  isInput: boolean;
  isOutput: boolean;
  /** "builtin", "usb", "bluetooth", "airplay", "hdmi", … */
  transportType?: string;
};

export type VolumeInfo = { volume?: number; muted?: boolean };

const TRANSPORT_LABELS: Record<string, string> = {
  builtin: "Built-In",
  usb: "USB",
  bluetooth: "Bluetooth",
  bluetoothle: "Bluetooth LE",
  airplay: "AirPlay",
  hdmi: "HDMI",
  displayport: "DisplayPort",
  thunderbolt: "Thunderbolt",
  firewire: "FireWire",
  pci: "PCI",
  avb: "AVB",
  virtual: "Virtual",
  aggregate: "Aggregate",
  autoaggregate: "Aggregate",
};

/** Readable connection type, shown as the device subtitle. */
export const transportLabel = (device: AudioDevice): string | undefined =>
  device.transportType ? TRANSPORT_LABELS[device.transportType] : undefined;

/** Tools already checked against assets/ in this process. */
const checkedTools = new Set<string>();

const sameContent = (a: string, b: string) =>
  fs.existsSync(b) && fs.statSync(a).size === fs.statSync(b).size && fs.readFileSync(a).equals(fs.readFileSync(b));

/**
 * The tool's path in the support folder, copied from assets/ when missing or different. The copy goes to a temporary
 * file that is then renamed: overwriting a binary in place keeps its inode, and macOS kills it ("Killed: 9")
 * because the cached code signature no longer matches.
 */
async function tool(name: "audio-devices" | "sound-control"): Promise<string> {
  const target = path.join(environment.supportPath, name);
  if (checkedTools.has(name)) return target;

  const source = path.join(environment.assetsPath, name);
  if (!sameContent(source, target)) {
    const temp = `${target}.${process.pid}.tmp`;
    fs.copyFileSync(source, temp);
    fs.chmodSync(temp, 0o755);
    fs.renameSync(temp, target);
  }
  checkedTools.add(name);
  return target;
}

async function run(name: "audio-devices" | "sound-control", args: string[]): Promise<string> {
  // Both tools exit with a non-zero code on failure, and execa then throws with their stderr.
  const { stdout } = await execa(await tool(name), args);
  return stdout;
}

/**
 * A short, readable message for a toast: the tool's own error text ("No device exists with id 123") instead of
 * execa's "Command failed with exit code 1: …/audio-devices …". The full error still goes to the console.
 */
export function errorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string" && stderr.trim()) return stderr.trim().replace(/^Error:\s*/, "");
    if (error instanceof Error) return error.message;
  }
  return String(error);
}

export async function getDevices(type: IOType): Promise<AudioDevice[]> {
  return JSON.parse(await run("audio-devices", ["list", `--${type}`, "--json"]));
}

export async function getDefaultDevice(type: IOType): Promise<AudioDevice> {
  return JSON.parse(await run("audio-devices", [type, "get", "--json"]));
}

/**
 * The devices of a direction and the current one. With no devices (a Mac mini has no microphone) there is no
 * current device either, and it is not asked for: that call would fail.
 */
export async function getDeviceState(type: IOType): Promise<{ devices: AudioDevice[]; current?: AudioDevice }> {
  const devices = await getDevices(type);
  if (devices.length === 0) return { devices };
  return { devices, current: await getDefaultDevice(type) };
}

/**
 * Make a device the default for its direction. For output, the "Play sound effects through current output"
 * preference also moves system sounds to it.
 */
export async function setDefaultDevice(type: IOType, deviceId: string) {
  await run("audio-devices", [type, "set", deviceId]);
  if (type === "output" && getPreferenceValues<Preferences>().systemOutput) {
    await run("audio-devices", ["system", "set", deviceId]);
  }
}

/** Volume (0–1) and mute of every device in this direction, keyed by Core Audio ID. Empty on failure. */
export async function getAllVolumeInfo(type: IOType): Promise<Record<string, VolumeInfo>> {
  try {
    const raw = JSON.parse(await run("sound-control", ["all", type])) as Record<
      string,
      { volume?: number | null; muted?: boolean | null }
    >;
    return Object.fromEntries(
      Object.entries(raw).map(([id, info]) => [
        id,
        { volume: info.volume != null ? info.volume / 100 : undefined, muted: info.muted ?? undefined },
      ]),
    );
  } catch {
    return {};
  }
}

/** Set the volume (0–1). */
export async function setVolume(type: IOType, deviceId: string, volume: number) {
  const percent = Math.round(Math.min(Math.max(volume, 0), 1) * 100);
  await run("sound-control", ["volume", type, deviceId, String(percent)]);
}

/** Toggle mute and return the new state. */
export async function toggleMute(type: IOType, deviceId: string): Promise<boolean> {
  return (await run("sound-control", ["mute", type, deviceId, "toggle"])).trim() === "true";
}
