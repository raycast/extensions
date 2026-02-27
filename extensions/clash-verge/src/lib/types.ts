export type Mode = "rule" | "global" | "direct";

export type NetworkFeature = "system-proxy" | "tun";

export interface MihomoConfig {
  mode: Mode;
  mixedPort: number;
  tunEnabled: boolean;
}

export interface SystemProxyStatus {
  enabled: boolean;
  httpEnabled: boolean;
  httpsEnabled: boolean;
  socksEnabled: boolean;
}
