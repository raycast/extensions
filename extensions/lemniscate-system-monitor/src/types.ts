import { Systeminformation } from "systeminformation";

export type Stats = {
  cpu: number;
  mem: number;
  cores: number[];
  cpuTemp?: number;
  cpuSpeed?: number;
  uptime?: number;
  processes?: Systeminformation.ProcessesProcessData[];
  networkStats?: Systeminformation.NetworkStatsData[];
  diskLayout?: Systeminformation.DiskLayoutData[];
  fsSize?: Systeminformation.FsSizeData[];
  battery?: Systeminformation.BatteryData;
  osInfo?: Systeminformation.OsData;
  systemInfo?: Systeminformation.SystemData;
  cpuInfo?: Systeminformation.CpuData;
  memDetails?: Systeminformation.MemData;
  loadAvg?: number[];
};
