export type DeviceKind = "P110" | "L530";

export type CachedDevice = {
  kind: DeviceKind;
  ip: string;
  alias?: string;
  lastSeenAt: number; // epoch ms
};

export type Prefs = {
  tapoEmail: string;
  tapoPassword: string;
  language?: "tr" | "en";
  subnet?: string;
  p110Ip?: string;
  l530Ip?: string;
  p110Alias?: string;
  l530Alias?: string;
};
