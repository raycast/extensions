export type BatteryTelemetry = {
  externalConnected?: boolean;
  isCharging?: boolean;
  fullyCharged?: boolean;
  percent?: number;
  cycleCount?: number;
  fullChargeCapacity?: number; // mAh
  nominalChargeCapacity?: number; // mAh; macOS's Maximum Capacity is based on this
  designCapacity?: number; // mAh
  notChargingReason?: number;
  systemLoadW?: number;
  systemLoadEstimated?: true; // derived from battery volts × amps (Intel, on battery), not measured by macOS
  systemLoadLive?: true; // read from SMC just now, rather than ioreg's once-a-minute telemetry
  adapterInputW?: number;
  adapterRatedW?: number; // power negotiated with the charger in W (Intel), e.g. 94 W from a 140 W adapter
  temperatureC?: number;
  updatedAt?: number; // epoch ms the system draw was measured: now when live, else macOS's last refresh
};

export type PowerSource = {
  source: "ac" | "battery";
  percent?: number;
  state?: string; // "charging" | "discharging" | "charged" | "AC attached" | …
  minutesRemaining?: number;
};

export type ProcessEnergy = {
  pid: number;
  command: string;
  energy: number; // unitless energy impact from top
  cpu: number; // percent of one core, may exceed 100
};

export type ProcessInfo = {
  etimeSec: number; // wall time since start
  cpuTimeSec: number; // total CPU time used
  user: string;
  ppid: number;
  command: string; // executable name, e.g. "caffeinate"
  path: string; // full executable path as ps reports it
};

export type SleepBlocker = {
  id: string; // pmset's assertion id, e.g. 0x0001542600018338; unique even when one process holds two alike
  pid: number;
  process: string;
  kind: "system" | "display";
  assertion: string; // e.g. PreventUserIdleSystemSleep
  heldSec: number;
  name: string; // e.g. "Handoff"
};

export type Snapshot = {
  t: number; // epoch ms
  battery: BatteryTelemetry;
  source?: PowerSource;
  processes: ProcessEnergy[];
  processInfo: Map<number, ProcessInfo>;
  blockers: SleepBlocker[];
  errors: string[]; // one entry per failed collector, e.g. "top: timeout"
  partial?: true; // a power-only poll: processes and blockers were not collected
  processesAt?: number; // epoch ms of the full poll the processes come from
};

// start: when the process started (epoch ms, to the minute), so a reused pid is not taken for it.
export type SampleProc = { pid: number; cmd: string; cpu: number; energy: number; start?: number };

export type Sample = {
  t: number;
  wAt?: number; // telemetry refresh time of systemW; repeats within a minute share it
  systemW?: number;
  percent?: number;
  onAC?: boolean;
  procs: SampleProc[];
};
