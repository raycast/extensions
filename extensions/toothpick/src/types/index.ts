import { Image, List } from "@raycast/api";

export type RawDeviceData = Record<string, Record<string, string>>;

export type Device = {
  name: string;
  icon: Image;
  model: string | undefined;
  accessories: List.Item.Accessory[];
  actions: React.ReactNode[];
  macAddress: string;
  connected: boolean;
  productId: string | undefined;
  vendorId: string | undefined;
};
