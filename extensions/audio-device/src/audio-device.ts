import { getAudioAPI, type AudioDevice, TransportType, isMacOS, isWindows } from "./platform";

export { AudioDevice, TransportType, isMacOS, isWindows };
export { getAudioAPI };

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

export async function getDevice(deviceId: string): Promise<AudioDevice> {
  const devices = await getAllDevices();
  const device = devices.find((d) => d.id === deviceId);
  if (!device) {
    throw new Error(`Device not found: ${deviceId}`);
  }
  return device;
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
  return api.getDefaultOutputDevice();
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
  return api.setDefaultOutputDevice(deviceId);
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
