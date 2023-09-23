export interface Device {
  lastBootedAt: string;
  dataPath: string;
  dataPathSize: number;
  logPath: string;
  udid: string;
  isAvailable: boolean;
  logPathSize: number;
  deviceTypeIdentifier: string;
  state: string; // "Booted" | "Shutdown"
  name: string;
}

export type SimualtorResponse = {
  devices: {
    [key: string]: Device[];
  };
};
