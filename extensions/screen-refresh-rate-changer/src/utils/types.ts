// Types for the extension

export interface DisplayInfo {
  Index: number;
  InstanceName: string;
  Active: boolean;
  IsPrimary: boolean;
  DeviceName: string;
}

export interface Preferences {
  autoRevert: boolean;
  revertTimeout: string;
  debugMode: boolean;
}

export interface CachedDisplayData {
  displays: DisplayInfo[];
  timestamp: number;
}

export interface CachedRefreshRates {
  [displayIndex: string]: {
    rates: number[];
    timestamp: number;
  };
}
