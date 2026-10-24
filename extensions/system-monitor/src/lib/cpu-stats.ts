import { cpus, type CpuInfo } from "os";

export interface CoreUsage {
  core: number;
  usage: number;
}

let previousCoreTimes: CpuInfo["times"][] | null = null;

export function resetPerCoreCpuBaseline(): void {
  previousCoreTimes = null;
}

function deltaCoreUsage(previous: CpuInfo["times"], current: CpuInfo["times"]): number {
  const idleDelta = current.idle - previous.idle;
  const totalDelta =
    current.user -
    previous.user +
    (current.nice - previous.nice) +
    (current.sys - previous.sys) +
    (current.irq - previous.irq) +
    idleDelta;

  if (totalDelta <= 0) {
    return 0;
  }

  return Math.round((1 - idleDelta / totalDelta) * 100);
}

export function getPerCoreCpuUsage(): { cores: CoreUsage[]; hasPreviousSample: boolean } {
  const currentCores = cpus();

  if (!previousCoreTimes) {
    previousCoreTimes = currentCores.map((core) => ({ ...core.times }));
    return {
      cores: currentCores.map((_, index) => ({ core: index + 1, usage: 0 })),
      hasPreviousSample: false,
    };
  }

  if (previousCoreTimes.length !== currentCores.length) {
    previousCoreTimes = currentCores.map((core) => ({ ...core.times }));
    return {
      cores: currentCores.map((_, index) => ({ core: index + 1, usage: 0 })),
      hasPreviousSample: false,
    };
  }

  const cores = currentCores.map((core, index) => ({
    core: index + 1,
    usage: deltaCoreUsage(previousCoreTimes![index], core.times),
  }));

  previousCoreTimes = currentCores.map((core) => ({ ...core.times }));

  return {
    cores,
    hasPreviousSample: true,
  };
}
