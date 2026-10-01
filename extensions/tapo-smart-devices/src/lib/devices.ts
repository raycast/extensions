import find from "local-devices";
import { Cache, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { cloudLogin, loginDeviceByIp, TapoDevice } from "tp-link-tapo-connect";

import { AvailableDevice, DeviceStatusEnum, DeviceTypeEnum, Device } from "./types";
import { isWindows, normaliseMacAddress } from "./utils";

const LOCAL_REQUEST_TIMEOUT_MS = 3000;

type TapoClient = Awaited<ReturnType<typeof loginDeviceByIp>>;

const cache = new Cache();
const clients = new Map<string, TapoClient>();

const devicesCacheKey = () => `devices:${getPreferenceValues<Preferences>().email}`;

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Device did not respond in time")), LOCAL_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

// Reuses the device session, logging in again if it has expired.
const withDeviceClient = async <T>(ip: string, request: (client: TapoClient) => Promise<T>): Promise<T> => {
  const cachedClient = clients.get(ip);

  if (cachedClient) {
    try {
      return await withTimeout(request(cachedClient));
    } catch {
      clients.delete(ip);
    }
  }

  const { email, password } = getPreferenceValues<Preferences>();
  const client = await withTimeout(loginDeviceByIp(email, password, ip));
  clients.set(ip, client);

  return withTimeout(request(client));
};

// Maps each IP to the ID of the device last confirmed to be there.
const verifiedDeviceIds = new Map<string, string>();

// Guards against a cached IP having been reassigned to another device.
const getVerifiedDeviceInfo = async (client: TapoClient, device: Device, ip: string) => {
  const deviceInfo = await client.getDeviceInfo();

  if (normaliseMacAddress(deviceInfo.mac) !== normaliseMacAddress(device.macAddress)) {
    verifiedDeviceIds.delete(ip);
    throw new Error(`Device at ${ip} is not ${device.alias}`);
  }

  verifiedDeviceIds.set(ip, device.deviceId);
  return deviceInfo;
};

const tapoDeviceTypeToDeviceType = (tapoDeviceType: string): DeviceTypeEnum | null => {
  switch (tapoDeviceType) {
    case "SMART.TAPOPLUG":
      return DeviceTypeEnum.Plug;
    case "SMART.TAPOBULB":
      return DeviceTypeEnum.Bulb;
    case "HOMEWIFISYSTEM":
      return DeviceTypeEnum.HomeWifiSystem;
    default:
      // The Tapo API can return device types we don't recognise. Return null
      // so the device can be filtered out rather than crashing the extension.
      return null;
  }
};

const tapoDeviceToDevice = (tapoDevice: TapoDevice): Device | null => {
  const type = tapoDeviceTypeToDeviceType(tapoDevice.deviceType);

  if (type === null) {
    return null;
  }

  return {
    ...tapoDevice,
    type,
    macAddress: tapoDevice.deviceMac,
    name: `Tapo ${tapoDevice.deviceName}`,
    alias: tapoDevice.alias,
    availabilityStatus: DeviceStatusEnum.Loading,
    isTurnedOn: null,
    ip: undefined,
    deviceKey: null,
  };
};

const isSupportedDevice = (device: Device): boolean =>
  device.type === DeviceTypeEnum.Plug || device.type === DeviceTypeEnum.Bulb;

export const getDevices = async (useCache = false): Promise<Device[]> => {
  const cachedDevices = useCache ? cache.get(devicesCacheKey()) : undefined;

  if (cachedDevices) {
    return JSON.parse(cachedDevices);
  }

  const { email, password } = getPreferenceValues<Preferences>();

  const cloudAPI = await cloudLogin(email, password);
  const tapoDevices = await cloudAPI.listDevices();

  return tapoDevices
    .map(tapoDeviceToDevice)
    .filter((device): device is Device => device !== null)
    .filter(isSupportedDevice);
};

export const saveDevices = (devices: Device[]): void => cache.set(devicesCacheKey(), JSON.stringify(devices));

export const clearSavedDevices = (): void => {
  cache.remove(devicesCacheKey());
};

const setDevicePower = async (device: AvailableDevice, turnOn: boolean): Promise<void> => {
  const state = turnOn ? "on" : "off";
  const toast = await showToast({ title: `Turning ${device.alias} ${state}...`, style: Toast.Style.Animated });

  try {
    await withDeviceClient(device.ip, async (client) => {
      if (verifiedDeviceIds.get(device.ip) !== device.deviceId) {
        await getVerifiedDeviceInfo(client, device, device.ip);
      }

      return turnOn ? client.turnOn() : client.turnOff();
    });

    toast.style = Toast.Style.Success;
    toast.title = `Turned ${device.alias} ${state}.`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to turn ${device.alias} ${state}`;
    toast.message = (error as Error).message;
    throw error;
  }
};

export const turnDeviceOn = (device: AvailableDevice): Promise<void> => setDevicePower(device, true);

export const turnDeviceOff = (device: AvailableDevice): Promise<void> => setDevicePower(device, false);

export const locateDevicesOnLocalNetwork = async (devices: Device[]): Promise<Device[]> => {
  const arpPath = isWindows ? "C:\\Windows\\System32\\arp.exe" : "/usr/sbin/arp";
  const localDevices = await find({ address: null, skipNameResolution: true, arpPath });

  return devices.map((device) => {
    const localDevice = localDevices.find(
      (localDevice) => normaliseMacAddress(localDevice.mac) === normaliseMacAddress(device.macAddress),
    );

    if (localDevice) {
      const ip = localDevice.ip;

      return { ...device, ip, availabilityStatus: DeviceStatusEnum.Available };
    } else {
      return { ...device, ip: undefined, availabilityStatus: DeviceStatusEnum.NotAvailable };
    }
  });
};

export const queryDevicesOnLocalNetwork = async (devices: Device[]): Promise<Device[]> =>
  Promise.all(
    devices.map(async (device) => {
      if (!device.ip) {
        // We haven't been able to locate this device on the local network, so we won't
        // be able to query its state.
        return { ...device, availabilityStatus: DeviceStatusEnum.NotAvailable };
      }

      try {
        const ip = device.ip;
        const deviceInfo = await withDeviceClient(ip, (client) => getVerifiedDeviceInfo(client, device, ip));

        return { ...device, availabilityStatus: DeviceStatusEnum.Available, isTurnedOn: deviceInfo.device_on };
      } catch {
        return { ...device, availabilityStatus: DeviceStatusEnum.NotAvailable };
      }
    }),
  );

export const isAvailableDevice = (device: Device): device is AvailableDevice =>
  device.availabilityStatus === DeviceStatusEnum.Available;

export const getDeviceIcon = (device: Device): string => {
  switch (device.type) {
    case DeviceTypeEnum.Bulb:
      return "💡";
    case DeviceTypeEnum.Plug:
      return "🔌";
    default:
      throw `Icon unknown for device type ${device.type}`;
  }
};

export const getOnStateText = (device: Device): string | null => {
  if (device.isTurnedOn == null) {
    return null;
  } else if (device.isTurnedOn) {
    return "On";
  } else {
    return "Off";
  }
};
