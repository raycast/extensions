export interface BatteryDataInterface {
  condition: string;
  cycleCount: string;
  batteryLevel: string;
  fullyCharged: boolean;
  isCharging: boolean;
  isOnAcPower: boolean;
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
  usedStorage: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  metric: string;
}

export interface ProcessDetail extends ProcessInfo {
  ppid: number;
  user: string;
  elapsed: string;
  cpuPercent: string;
  memoryPercent: string;
  memoryRss: string;
  command: string;
}
