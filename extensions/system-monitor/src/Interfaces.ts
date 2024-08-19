export interface ExecError extends Error {
  code: number;
  stdout: string;
  stderr: string;
}

export interface NetworkMonitorState {
  upload: number;
  download: number;
  processList: [string, number, number][];
  prevProcess: { [key: string]: number[] };
}

export interface CpuMonitorState {
  cpu: string;
  uptime: string;
  avgLoad: string[];
  topProcess: string[][];
}

export interface MemoryMonitorState {
  freeDisk: string;
  totalDisk: string;
  totalMem: string;
  freeMem: string;
  freeMemPercentage: string;
  topProcess: string[][];
}

export interface PowerMonitorState {
  batteryLevel: string;
  isCharging: boolean;
  cycleCount: string;
  batteryCondition: string;
  maxBatteryCapacity: string;
  batteryTime: string;
  timeOnBattery: string;
}

export interface BatteryDataInterface {
  condition: string;
  cycleCount: string;
  batteryLevel: string;
  fullyCharged: boolean;
  isCharging: boolean;
  maximumCapacity: string;
  temperature: string;
  timeRemaining: number;
}

export interface MemoryInterface {
  memTotal: number;
  memUsed: number;
}

export interface DiskInterface {
  diskName: string;
  totalSize: string;
  totalAvailableStorage: string;
}
