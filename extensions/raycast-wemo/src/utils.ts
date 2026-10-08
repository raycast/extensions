import { Dispatch } from "react";
import Wemo from "wemo-client";
import { LocalStorage } from "@raycast/api";
import { DeviceInfo } from "./types";
import { SetStateAction } from "react";

export const getWemoDevices = async () => {
  const wemo = new Wemo();
  const devices: DeviceInfo[] = [];

  wemo.discover(async (err, deviceInfo: DeviceInfo) => {
    if (
      [Wemo.DEVICE_TYPE.Switch, Wemo.DEVICE_TYPE.LightSwitch, Wemo.DEVICE_TYPE.Dimmer].includes(deviceInfo.deviceType)
    )
      devices.push(deviceInfo);
  });

  await delay(2 * 1000);

  LocalStorage.setItem("devices", JSON.stringify(devices));
  return devices;
};

const delay = (time: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, time);
  });

export // Todo -- Fix binaryState imple

const loadDevices = async (setDevices: Dispatch<DeviceInfo[]>, setIsLoading: Dispatch<boolean>) => {
  setIsLoading(true);
  const deviceJSON = (await LocalStorage.getItem("devices")) as string | undefined;
  if (deviceJSON) {
    const deviceList = JSON.parse(deviceJSON) as DeviceInfo[];
    setDevices(deviceList.sort((a, b) => (a.friendlyName < b.friendlyName ? -1 : 1)));
  }

  // Lazily refresh
  const fresh = await getWemoDevices();
  setDevices(fresh.sort((a, b) => (a.friendlyName < b.friendlyName ? -1 : 1)));
  setIsLoading(false);
};

export const toggleDeviceState = async (wemo: InstanceType<typeof Wemo>, item: DeviceInfo) => {
  const client = wemo.client(item);

  const binaryState = await new Promise((resolve, reject) => {
    client.getBinaryState((err, binaryState) => {
      if (err) {
        return reject(err);
      }
      resolve(binaryState);
    });
  });

  await new Promise((resolve, reject) => {
    client.setBinaryState(binaryState === "0" ? 1 : 0, (err, binaryState) => {
      if (err) {
        return reject(err);
      }
      resolve(binaryState);
    });
  });
};

export const setBrightness = async (
  direction: number,
  wemo: InstanceType<typeof Wemo>,
  item: DeviceInfo,
  setDevices: Dispatch<SetStateAction<DeviceInfo[]>>
) => {
  const client = wemo.client(item);

  const brightness: number = await new Promise((resolve, reject) => {
    client.getBrightness((err, brightness) => {
      if (err || !brightness) {
        return reject(err);
      }

      resolve(brightness);
    });
  });

  const newBrightness =
    direction > 0 ? (brightness + 10 > 100 ? 100 : brightness + 10) : brightness - 10 < 0 ? 0 : brightness - 10;

  await new Promise((resolve, reject) => {
    client.setBrightness(newBrightness, (err, binaryState) => {
      if (err) {
        return reject(err);
      }

      setDevices((devices) =>
        devices.reduce<DeviceInfo[]>((acc, device) => {
          if (device.macAddress === item.macAddress) {
            return [...acc, { ...device, brightness: newBrightness }];
          } else {
            return [...acc, device];
          }
        }, [])
      );
      resolve(binaryState);
    });
  });
};
