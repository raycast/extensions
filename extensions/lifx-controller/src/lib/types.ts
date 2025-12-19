export interface LIFXLight {
  id: string;
  label: string;
  power: boolean;
  brightness: number; // 0-100
  hue: number; // 0-360
  saturation: number; // 0-100
  kelvin: number; // 2500-9000
  connected: boolean;
  source: "lan" | "http";
  reachable: boolean;
}

export interface LightProfile {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lights: ProfileLightState[];
}

export interface ProfileLightState {
  lightId: string;
  lightLabel: string;
  power: boolean;
  brightness: number;
  hue: number;
  saturation: number;
  kelvin: number;
}

export interface LightControl {
  power?: boolean;
  brightness?: number;
  hue?: number;
  saturation?: number;
  kelvin?: number;
  duration?: number; // fade duration in ms
}

export interface Preferences {
  httpApiToken?: string;
  defaultFadeDuration: string;
  lanTimeout: string;
  enableLanDiscovery: boolean;
  lanStateTimeout: string;
  lanRetryAttempts: string;
  lanCooldownPeriod: string;
}

export interface ConnectionState {
  lanAvailable: boolean;
  httpAvailable: boolean;
  activeLights: LIFXLight[];
  lastDiscovery: Date | null;
}
