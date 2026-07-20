import find from "local-devices";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { cloudLogin, loginDeviceByIp, TapoDevice } from "tp-link-tapo-connect";

import { AvailableDevice, DeviceStatusEnum, DeviceTypeEnum, Device } from "./types";
import { isWindows, normaliseMacAddress } from "./utils";

const tapoDeviceTypeToDeviceType = (tapoDeviceType: string): DeviceTypeEnum => {
  switch (tapoDeviceType) {
    case "SMART.TAPOPLUG":
      return DeviceTypeEnum.Plug;
    case "SMART.TAPOBULB":
      return DeviceTypeEnum.Bulb;
    case "HOMEWIFISYSTEM":
      return DeviceTypeEnum.HomeWifiSystem;
    default:
      throw `Device type ${tapoDeviceType} not supported`;
  }
};

const tapoDeviceToDevice = (tapoDevice: TapoDevice): Device => ({
  ...tapoDevice,
  type: tapoDeviceTypeToDeviceType(tapoDevice.deviceType),
  macAddress: tapoDevice.deviceMac,
  name: `Tapo ${tapoDevice.deviceName}`,
  alias: tapoDevice.alias,
  availabilityStatus: DeviceStatusEnum.Loading,
  isTurnedOn: null,
  ip: undefined,
  deviceKey: null,
});

const isSupportedDevice = (device: Device): boolean =>
  device.type === DeviceTypeEnum.Plug || device.type === DeviceTypeEnum.Bulb;

export const getDevices = async (): Promise<Device[]> => {
  const { email, password } = getPreferenceValues<Preferences>();

  const cloudAPI = await cloudLogin(email, password);
  const tapoDevices = await cloudAPI.listDevices();

  return tapoDevices.map(tapoDeviceToDevice).filter(isSupportedDevice);
};

export const turnDeviceOn = async (device: AvailableDevice): Promise<void> => {
  const { email, password } = getPreferenceValues<Preferences>();

  const toast = await showToast({ title: `Turning ${device.alias} on...`, style: Toast.Style.Animated });

  // We will only call this function with available, logged-in devices, so we can
  // assume that they key is there.
  const tapoClient = await loginDeviceByIp(email, password, device.ip);
  await tapoClient.turnOn();

  toast.style = Toast.Style.Success;
  toast.title = `Turned ${device.alias} on.`;
};

export const turnDeviceOff = async (device: AvailableDevice): Promise<void> => {
  const { email, password } = getPreferenceValues<Preferences>();

  const toast = await showToast({ title: `Turning ${device.alias} off...`, style: Toast.Style.Animated });

  // We will only call this function with available, logged-in devices, so we can
  // assume that they key is there.
  const tapoClient = await loginDeviceByIp(email, password, device.ip);
  await tapoClient.turnOff();

  toast.style = Toast.Style.Success;
  toast.title = `Turned ${device.alias} off.`;
};

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
      return { ...device, availabilityStatus: DeviceStatusEnum.NotAvailable };
    }
  });
};

export const queryDevicesOnLocalNetwork = async (devices: Device[]) => {
  const { email, password } = getPreferenceValues<Preferences>();

  return Promise.all(
    devices.map(async (device) => {
      if (device.ip) {
        const tapoClient = await loginDeviceByIp(email, password, device.ip);
        const deviceInfo = await tapoClient.getDeviceInfo();
        const isTurnedOn = deviceInfo.device_on;

        return { ...device, ...tapoClient, isTurnedOn };
      } else {
        // We haven't been able to locate this device on the local network, so we won't
        // be able to query its state.
        return device;
      }
    }),
  );
};

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
