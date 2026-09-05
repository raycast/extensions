/** Network object from `macwifi-cli scan --json` / `info --json`. */
export interface WifiNetwork {
  ssid: string;
  bssid: string;
  rssi: number;
  noise: number;
  channel: number;
  channel_band: string;
  channel_width: number;
  security: string;
  phy_mode: string;
  current: boolean;
  saved: boolean;
}

/** `macwifi-cli info --json` when not on Wi-Fi. */
export interface DisconnectedInfo {
  connected: false;
}

export interface PasswordResult {
  ssid: string;
  found: boolean;
  password?: string;
}

export function isDisconnectedInfo(value: unknown): value is DisconnectedInfo {
  return Boolean(value && typeof value === "object" && (value as DisconnectedInfo).connected === false);
}

export function isWifiNetwork(value: unknown): value is WifiNetwork {
  if (!value || typeof value !== "object") {
    return false;
  }
  const net = value as Partial<WifiNetwork>;
  return typeof net.ssid === "string" && typeof net.rssi === "number" && typeof net.current === "boolean";
}
