import { MemoryInterface } from "../Interfaces";
import { execf } from "./exec";

export interface MemoryStats extends MemoryInterface {
  wired: number;
  compressed: number;
  active: number;
  inactive: number;
  purgeable: number;
  swapUsed: number;
  swapTotal: number;
  pressureLevel: string;
}

// kern.memorystatus_vm_pressure_level: 1=normal, 2=warning, 3=urgent, 4=critical
const PRESSURE_LABELS: Record<number, string> = {
  1: "Normal",
  2: "Warning",
  3: "Urgent",
  4: "Critical",
};

function parseVmStatPages(output: string, label: string): number {
  const line = output.split("\n").find((entry) => entry.includes(label));
  const match = line?.match(/:\s+([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

export async function getMemoryStats(): Promise<MemoryStats> {
  const [
    pHwPagesize,
    pMemTotal,
    pVmPagePageableInternalCount,
    pVmPagePurgeableCount,
    vmStatOutput,
    swapOutput,
    pressureOutput,
  ] = await Promise.all([
    execf("/usr/sbin/sysctl", ["-n", "hw.pagesize"]),
    execf("/usr/sbin/sysctl", ["-n", "hw.memsize"]),
    execf("/usr/sbin/sysctl", ["-n", "vm.page_pageable_internal_count"]),
    execf("/usr/sbin/sysctl", ["-n", "vm.page_purgeable_count"]),
    execf("/usr/bin/vm_stat"),
    execf("/usr/sbin/sysctl", ["-n", "vm.swapusage"]).catch(() => "total = 0.00M  used = 0.00M  free = 0.00M"),
    execf("/usr/sbin/sysctl", ["-n", "kern.memorystatus_vm_pressure_level"]).catch(() => "0"),
  ]);

  const hwPagesize = parseFloat(pHwPagesize);
  const memTotal = parseFloat(pMemTotal) / 1024 / 1024;
  const pagesApp = parseFloat(pVmPagePageableInternalCount) - parseFloat(pVmPagePurgeableCount);
  const pagesWired = parseVmStatPages(vmStatOutput, "wired down");
  const pagesCompressed = parseVmStatPages(vmStatOutput, "occupied by compressor");
  const pagesActive = parseVmStatPages(vmStatOutput, "active");
  const pagesInactive = parseVmStatPages(vmStatOutput, "inactive");
  const pagesPurgeable = parseFloat(pVmPagePurgeableCount);

  const pagesToMb = (pages: number) => (pages * hwPagesize) / 1024 / 1024;

  const memUsed = pagesToMb(pagesApp + pagesWired + pagesCompressed);
  const swapMatch = swapOutput.match(/total = ([\d.]+)M\s+used = ([\d.]+)M/);
  const pressureLevel = PRESSURE_LABELS[parseInt(pressureOutput, 10)] ?? "Unknown";

  return {
    memTotal,
    memUsed,
    wired: pagesToMb(pagesWired),
    compressed: pagesToMb(pagesCompressed),
    active: pagesToMb(pagesActive),
    inactive: pagesToMb(pagesInactive),
    purgeable: pagesToMb(pagesPurgeable),
    swapUsed: swapMatch ? parseFloat(swapMatch[2]) : 0,
    swapTotal: swapMatch ? parseFloat(swapMatch[1]) : 0,
    pressureLevel,
  };
}
