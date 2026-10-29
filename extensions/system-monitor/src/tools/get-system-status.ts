import { cpus } from "node:os";
import { setTimeout } from "node:timers/promises";
import { calculateDiskStorage } from "../lib/disk-info";
import { getMemoryStats } from "../lib/memory-stats";
import { getBatteryData } from "../Power/PowerUtils";

function cpuTimes() {
  return cpus().reduce(
    (totals, cpu) => {
      const { user, nice, sys, irq, idle } = cpu.times;
      totals.idle += idle;
      totals.total += user + nice + sys + irq + idle;
      return totals;
    },
    { idle: 0, total: 0 },
  );
}

async function getCpuUsage(): Promise<number | null> {
  const before = cpuTimes();
  await setTimeout(250);
  const after = cpuTimes();
  const total = after.total - before.total;
  return total > 0 ? Math.round((1 - (after.idle - before.idle) / total) * 100) : null;
}

/** Read current Mac resource usage for questions about system status and available storage. */
export default async function getSystemStatus() {
  const [cpuUsagePercent, memory, disks, battery] = await Promise.all([
    getCpuUsage(),
    getMemoryStats(),
    calculateDiskStorage(),
    getBatteryData().catch(() => null),
  ]);

  return {
    sampledAt: new Date().toISOString(),
    cpuUsagePercent,
    memory: {
      totalGB: Math.round(memory.memTotal / 1024),
      usedGB: Math.round(memory.memUsed / 1024),
      pressure: memory.pressureLevel,
      swapUsedMB: Math.round(memory.swapUsed),
    },
    disks: disks.map((disk) => ({
      name: disk.diskName,
      totalGB: Number(disk.totalSize),
      availableGB: Number(disk.totalAvailableStorage),
      isExternal: disk.isExternal,
    })),
    battery: battery
      ? {
          levelPercent: battery.batteryLevel,
          charging: battery.isCharging,
          onAcPower: battery.isOnAcPower,
          condition: battery.condition,
        }
      : null,
  };
}
