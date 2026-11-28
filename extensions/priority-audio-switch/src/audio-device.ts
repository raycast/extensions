// Audio devices on macOS, through the Swift package in swift/ (Core Audio). `ray build` compiles it because of the
// `swift:` import below; each Swift function returns a Promise and rejects with the Swift error's message.
import { getPreferenceValues } from "@raycast/api";
import * as swift from "swift:../swift";

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

/**
 * A short, readable message for a toast ("No output device exists with id 123"): a Swift error carries its message
 * in `stderr`; anything else uses its own message.
 */
export function errorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string" && stderr.trim()) return stderr.trim();
    if (error instanceof Error) return error.message;
  }
  return String(error);
}

/**
 * The devices of a direction and the current one. With no devices (a Mac mini has no microphone) there is no
 * current device either.
 */
export async function getDeviceState(type: IOType): Promise<{ devices: AudioDevice[]; current?: AudioDevice }> {
  const { devices, current } = (await swift.deviceState(type)) as {
    devices: AudioDevice[];
    current: AudioDevice | null;
  };
  return { devices, current: current ?? undefined };
}

export async function getDevices(type: IOType): Promise<AudioDevice[]> {
  return (await getDeviceState(type)).devices;
}

/** The current device; fails when the direction has none. */
export async function getDefaultDevice(type: IOType): Promise<AudioDevice> {
  const { current } = await getDeviceState(type);
  if (!current) throw new Error(`No ${type} device`);
  return current;
}

/**
 * Make a device the default for its direction. For output, the "Play sound effects through current output"
 * preference also moves system sounds to it.
 */
export async function setDefaultDevice(type: IOType, deviceId: string) {
  const systemSounds = type === "output" && getPreferenceValues<Preferences>().systemOutput;
  await swift.setDefaultDevice(type, deviceId, systemSounds);
}

/** Volume (0–1) and mute of every device in this direction, keyed by Core Audio ID. Empty on failure. */
export async function getAllVolumeInfo(type: IOType): Promise<Record<string, VolumeInfo>> {
  try {
    const raw = (await swift.volumes(type)) as Record<string, { volume?: number | null; muted?: boolean | null }>;
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
  await swift.setVolume(type, deviceId, Math.round(Math.min(Math.max(volume, 0), 1) * 100));
}

/** Toggle mute and return the new state. */
export async function toggleMute(type: IOType, deviceId: string): Promise<boolean> {
  return swift.toggleMute(type, deviceId);
}
