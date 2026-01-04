import { TapoDevice, TapoDeviceKey } from "tp-link-tapo-connect";

export enum DeviceTypeEnum {
  Bulb = "bulb",
  Plug = "plug",
  HomeWifiSystem = "home_wifi_system",
}

export enum DeviceStatusEnum {
  Loading = "loading",
  Available = "available",
  NotAvailable = "not_available",
}

export type Device = TapoDevice & {
  type: DeviceTypeEnum;
  macAddress: string;
  name: string;
  availabilityStatus: DeviceStatusEnum;
  isTurnedOn: boolean | null;
  deviceKey: TapoDeviceKey | null;
};

export type AvailableDevice = Device & {
  ip: string;
};
