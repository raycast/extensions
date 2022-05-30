import find from "local-devices";
import util from "util";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  cloudLogin,
  listDevices,
  loginDeviceByIp,
  getDeviceInfo,
  turnOn,
  turnOff,
  TapoDevice,
  TapoDeviceKey,
  loginDevice,
} from "tp-link-tapo-connect";

import { AvailableDevice, Device, DeviceStatusEnum, DeviceTypeEnum, Preferences } from "./types";
import { normaliseMacAddress } from "./utils";

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
  id: tapoDevice.deviceId,
  type: tapoDeviceTypeToDeviceType(tapoDevice.deviceType),
  macAddress: tapoDevice.deviceMac,
  name: `Tapo ${tapoDevice.deviceName}`,
  alias: tapoDevice.alias,
  status: DeviceStatusEnum.Loading,
  isTurnedOn: null,
  ipAddress: null,
  deviceKey: null,
});

const isSupportedDevice = (device: Device): boolean =>
  device.type === DeviceTypeEnum.Plug || device.type === DeviceTypeEnum.Bulb;

export const getDevices = async (): Promise<Device[]> => {
  const { email, password } = await getPreferenceValues<Preferences>();

  const cloudToken = await cloudLogin(email, password);
  const tapoDevices = await listDevices(cloudToken);

  return tapoDevices.map(tapoDeviceToDevice).filter(isSupportedDevice);
};

export const turnDeviceOn = async (device: Device): Promise<void> => {
  const { email, password } = await getPreferenceValues<Preferences>();

  const toast = await showToast({ title: `Turning ${device.alias} on...`, style: Toast.Style.Animated });

  // We will only call this function with available, logged-in devices, so we can
  // assume that they key is there.
  await turnOn(device.deviceKey as TapoDeviceKey);

  toast.hide();
  await showToast({ title: `Turned ${device.alias} on.`, style: Toast.Style.Success });
};

export const turnDeviceOff = async (device: Device): Promise<void> => {
  const { email, password } = await getPreferenceValues<Preferences>();

  const toast = await showToast({ title: `Turning ${device.alias} off...`, style: Toast.Style.Animated });

  // We will only call this function with available, logged-in devices, so we can
  // assume that they key is there.
  await turnOff(device.deviceKey as TapoDeviceKey);

  toast.hide();
  await showToast({ title: `Turned ${device.alias} off.`, style: Toast.Style.Success });
};

export const locateDevicesOnLocalNetwork = async (devices: Device[]): Promise<Device[]> => {
  const localDevices = await find(undefined, true, "/usr/sbin/arp");

  return devices.map((device) => {
    const localDevice = localDevices.find(
      (localDevice) => normaliseMacAddress(localDevice.mac) === normaliseMacAddress(device.macAddress)
    );

    if (localDevice) {
      const ipAddress = localDevice.ip;

      return { ...device, ipAddress, status: DeviceStatusEnum.Available };
    } else {
      return { ...device, status: DeviceStatusEnum.NotAvailable };
    }
  });
};

export const queryDevicesOnLocalNetwork = async (devices: Device[]): Promise<Device[]> => {
  const { email, password } = await getPreferenceValues<Preferences>();

  return Promise.all(
    devices.map(async (device) => {
      if (device.ipAddress) {
        const deviceKey = await loginDeviceByIp(email, password, device.ipAddress);
        const deviceInfo = await getDeviceInfo(deviceKey);
        const isTurnedOn = deviceInfo.device_on;

        return { ...device, deviceKey, isTurnedOn };
      } else {
        // We haven't been able to locate this device on the local network, so we won't
        // be able to query its state.
        return device;
      }
    })
  );
};

export const isAvailableDevice = (device: Device): boolean => device.status === DeviceStatusEnum.Available;

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
