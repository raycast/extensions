export type DeviceCategory = "plug" | "light" | "camera" | "other";

export type DeviceRecord = {
  id: string;
  alias: string;
  model: string;
  type: string;
  mac: string;
  category: DeviceCategory;
  ip?: string;
};

export type CachedDevice = {
  id: string;
  ip: string;
  alias?: string;
  model?: string;
  category?: DeviceCategory;
  lastSeenAt: number; // epoch ms
};

export type Prefs = {
  tapoEmail: string;
  tapoPassword: string;
  language?: "tr" | "en";
  subnet?: string;
  deviceScope?: "all" | "selected";
  ipOverrides?: string;
  p110Ip?: string;
  l530Ip?: string;
};
