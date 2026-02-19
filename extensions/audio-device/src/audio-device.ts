import { TransportType, type AudioDevice, isMacOS, isWindows, getAudioAPI } from "./platform";

// Re-export from platform module
export { TransportType, type AudioDevice, isMacOS, isWindows, getAudioAPI };

let apiInstance: Awaited<ReturnType<typeof getAudioAPI>> | null = null;

async function getAPI() {
  if (!apiInstance) {
    apiInstance = await getAudioAPI();
  }
  return apiInstance;
}

export async function getAllDevices(): Promise<AudioDevice[]> {
  const api = await getAPI();
  return api.getAllDevices();
}

export async function getInputDevices(): Promise<AudioDevice[]> {
  const api = await getAPI();
  return api.getInputDevices();
}

export async function getOutputDevices(): Promise<AudioDevice[]> {
  const api = await getAPI();
  return api.getOutputDevices();
}

export async function getDefaultOutputDevice(): Promise<AudioDevice> {
  const api = await getAPI();
  return api.getDefaultOutputDevice();
}

export async function getDefaultInputDevice(): Promise<AudioDevice> {
  const api = await getAPI();
  return api.getDefaultInputDevice();
}

export async function getDefaultSystemDevice(): Promise<AudioDevice> {
  const api = await getAPI();
  if (api.getDefaultSystemDevice) {
    return api.getDefaultSystemDevice();
  }
  throw new Error("System device is not supported on this platform");
}

export async function setDefaultOutputDevice(deviceId: string) {
  const api = await getAPI();
  return api.setDefaultOutputDevice(deviceId);
}

export async function setDefaultInputDevice(deviceId: string) {
  const api = await getAPI();
  return api.setDefaultInputDevice(deviceId);
}

export async function setDefaultSystemDevice(deviceId: string) {
  const api = await getAPI();
  if (api.setDefaultSystemDevice) {
    return api.setDefaultSystemDevice(deviceId);
  }
  // Silently ignore on platforms that don't support system device
  return Promise.resolve();
}

export async function getOutputDeviceVolume(deviceId: string) {
  const api = await getAPI();
  if (api.getOutputDeviceVolume) {
    return api.getOutputDeviceVolume(deviceId);
  }
  return undefined;
}

export async function setOutputDeviceVolume(deviceId: string, volume: number) {
  const api = await getAPI();
  if (api.setOutputDeviceVolume) {
    return api.setOutputDeviceVolume(deviceId, volume);
  }
}

export async function getOutputDeviceMute(deviceId: string) {
  const api = await getAPI();
  if (api.getOutputDeviceMute) {
    return api.getOutputDeviceMute(deviceId);
  }
  return undefined;
}

export async function setOutputDeviceMute(deviceId: string, muted: boolean) {
  const api = await getAPI();
  if (api.setOutputDeviceMute) {
    return api.setOutputDeviceMute(deviceId, muted);
  }
}

export async function toggleOutputDeviceMute(deviceId: string) {
  const api = await getAPI();
  if (api.toggleOutputDeviceMute) {
    return api.toggleOutputDeviceMute(deviceId);
  }
  return false;
}

export async function getInputDeviceVolume(deviceId: string) {
  const api = await getAPI();
  if (api.getInputDeviceVolume) {
    return api.getInputDeviceVolume(deviceId);
  }
  return undefined;
}

export async function setInputDeviceVolume(deviceId: string, volume: number) {
  const api = await getAPI();
  if (api.setInputDeviceVolume) {
    return api.setInputDeviceVolume(deviceId, volume);
  }
}

export async function getInputDeviceMute(deviceId: string) {
  const api = await getAPI();
  if (api.getInputDeviceMute) {
    return api.getInputDeviceMute(deviceId);
  }
  return undefined;
}

export async function setInputDeviceMute(deviceId: string, muted: boolean) {
  const api = await getAPI();
  if (api.setInputDeviceMute) {
    return api.setInputDeviceMute(deviceId, muted);
  }
}

export async function toggleInputDeviceMute(deviceId: string) {
  const api = await getAPI();
  if (api.toggleInputDeviceMute) {
    return api.toggleInputDeviceMute(deviceId);
  }
  return false;
}

export async function createAggregateDevice(
  name: string,
  mainDeviceId: string,
  otherDeviceIds?: string[],
  options?: { multiOutput?: boolean },
): Promise<AudioDevice> {
  const api = await getAPI();
  if (api.createAggregateDevice) {
    return api.createAggregateDevice(name, mainDeviceId, otherDeviceIds, options);
  }
  throw new Error("Aggregate devices are not supported on this platform");
}

export async function destroyAggregateDevice(deviceId: string) {
  const api = await getAPI();
  if (api.destroyAggregateDevice) {
    return api.destroyAggregateDevice(deviceId);
  }
  throw new Error("Aggregate devices are not supported on this platform");
}
