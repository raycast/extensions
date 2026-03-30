import { getPreferenceValues } from "@raycast/api";
import { TransportType, type AudioDevice, type IOType, isMacOS, isWindows, getAudioAPI } from "./platform";

export { TransportType, type AudioDevice, type IOType, isMacOS, isWindows, getAudioAPI };

export async function getAllDevices(): Promise<AudioDevice[]> {
  const api = await getAudioAPI();
  return api.getAllDevices();
}

export async function getInputDevices(): Promise<AudioDevice[]> {
  const api = await getAudioAPI();
  return api.getInputDevices();
}

export async function getOutputDevices(): Promise<AudioDevice[]> {
  const api = await getAudioAPI();
  return api.getOutputDevices();
}

export async function getDefaultOutputDevice(): Promise<AudioDevice> {
  const api = await getAudioAPI();
  return api.getDefaultOutputDevice();
}

export async function getDefaultInputDevice(): Promise<AudioDevice> {
  const api = await getAudioAPI();
  return api.getDefaultInputDevice();
}

export async function getDefaultSystemDevice(): Promise<AudioDevice> {
  const api = await getAudioAPI();
  if (api.getDefaultSystemDevice) {
    return api.getDefaultSystemDevice();
  }
  throw new Error("System device is not supported on this platform");
}

export async function setDefaultOutputDevice(deviceId: string) {
  const api = await getAudioAPI();
  return api.setDefaultOutputDevice(deviceId);
}

export async function setDefaultInputDevice(deviceId: string) {
  const api = await getAudioAPI();
  return api.setDefaultInputDevice(deviceId);
}

export async function setDefaultSystemDevice(deviceId: string) {
  const api = await getAudioAPI();
  if (api.setDefaultSystemDevice) {
    return api.setDefaultSystemDevice(deviceId);
  }
  return Promise.resolve();
}

export async function getOutputDeviceVolume(deviceId: string) {
  const api = await getAudioAPI();
  if (api.getOutputDeviceVolume) {
    return api.getOutputDeviceVolume(deviceId);
  }
  return undefined;
}

export async function setOutputDeviceVolume(deviceId: string, volume: number) {
  const api = await getAudioAPI();
  if (api.setOutputDeviceVolume) {
    return api.setOutputDeviceVolume(deviceId, volume);
  }
}

export const MAC_VOLUME_STEPS = 16;

/**
 * Convert percentage to steps
 * @example pctToSteps(50) // returns 8
 */
export function pctToSteps(pct: number): number {
  return Math.round((pct / 100) * MAC_VOLUME_STEPS);
}

/**
 * Convert steps to percentage
 *
 * @example stepsToPct(8) // returns 50
 */
export function stepsToPct(steps: number): number {
  return Math.round((steps / MAC_VOLUME_STEPS) * 100);
}

/**
 * Format a 0–100 percentage volume according to the user's volumeDisplay preference.
 * Returns e.g. "50%" or "8/16 Steps".
 */
export function formatVolume(pct: number): string {
  const { volumeDisplay } = getPreferenceValues();
  if (volumeDisplay === "steps") {
    const steps = pctToSteps(pct);
    return `${steps}/${MAC_VOLUME_STEPS} Steps`;
  }
  return `${pct}%`;
}

export async function getOutputDeviceMute(deviceId: string) {
  const api = await getAudioAPI();
  if (api.getOutputDeviceMute) {
    return api.getOutputDeviceMute(deviceId);
  }
  return undefined;
}

export async function setOutputDeviceMute(deviceId: string, muted: boolean) {
  const api = await getAudioAPI();
  if (api.setOutputDeviceMute) {
    return api.setOutputDeviceMute(deviceId, muted);
  }
}

export async function toggleOutputDeviceMute(deviceId: string) {
  const api = await getAudioAPI();
  if (api.toggleOutputDeviceMute) {
    return api.toggleOutputDeviceMute(deviceId);
  }
  return false;
}

export async function getInputDeviceVolume(deviceId: string) {
  const api = await getAudioAPI();
  if (api.getInputDeviceVolume) {
    return api.getInputDeviceVolume(deviceId);
  }
  return undefined;
}

export async function setInputDeviceVolume(deviceId: string, volume: number) {
  const api = await getAudioAPI();
  if (api.setInputDeviceVolume) {
    return api.setInputDeviceVolume(deviceId, volume);
  }
}

export async function getInputDeviceMute(deviceId: string) {
  const api = await getAudioAPI();
  if (api.getInputDeviceMute) {
    return api.getInputDeviceMute(deviceId);
  }
  return undefined;
}

export async function setInputDeviceMute(deviceId: string, muted: boolean) {
  const api = await getAudioAPI();
  if (api.setInputDeviceMute) {
    return api.setInputDeviceMute(deviceId, muted);
  }
}

export async function toggleInputDeviceMute(deviceId: string) {
  const api = await getAudioAPI();
  if (api.toggleInputDeviceMute) {
    return api.toggleInputDeviceMute(deviceId);
  }
  return false;
}

export async function getAllVolumeInfo(
  type: "input" | "output",
): Promise<Record<string, { volume?: number; muted?: boolean }>> {
  const api = await getAudioAPI();
  const fn = type === "output" ? api.getAllOutputVolumeInfo : api.getAllInputVolumeInfo;
  return fn ? fn.call(api) : {};
}

export async function createAggregateDevice(
  name: string,
  mainDeviceId: string,
  otherDeviceIds?: string[],
  options?: { multiOutput?: boolean },
): Promise<AudioDevice> {
  const api = await getAudioAPI();
  if (api.createAggregateDevice) {
    return api.createAggregateDevice(name, mainDeviceId, otherDeviceIds, options);
  }
  throw new Error("Aggregate devices are not supported on this platform");
}

export async function destroyAggregateDevice(deviceId: string) {
  const api = await getAudioAPI();
  if (api.destroyAggregateDevice) {
    return api.destroyAggregateDevice(deviceId);
  }
  throw new Error("Aggregate devices are not supported on this platform");
}
