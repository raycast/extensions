import { cpus } from "os";

export type CPUStats = ReturnType<typeof getCPUStats>;
export function calculateCPUUsage(stats1: CPUStats, stats2: CPUStats) {
  const startIdle = stats1.idle;
  const startTotal = stats1.total;
  const endIdle = stats2.idle;
  const endTotal = stats2.total;

  const idle = endIdle - startIdle;
  const total = endTotal - startTotal;
  return 1 - idle / total;
}
export function getCPUStats() {
  let user = 0;
  let nice = 0;
  let sys = 0;
  let idle = 0;
  let irq = 0;

  for (const cpu of cpus()) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    irq += cpu.times.irq;
    idle += cpu.times.idle;
  }

  const total = user + nice + sys + idle + irq;

  return {
    idle,
    total,
  };
}
