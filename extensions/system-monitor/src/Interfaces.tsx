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
  avgLoad: string[];
  topProcess: string[][];
}

export interface MemoryMonitorState {
  freeDisk: string;
  totalDisk: string;
  freeMem: string;
  freeMemPercentage: string;
  topProcess: string[][];
}

export interface PowerMointorState {
  batteryLevel: string;
  isCharging: boolean;
  cycleCount: string;
  batteryCondition: string;
  maxBatteryCapacity: string;
  batteryTime: string;
}
