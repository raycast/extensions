import { execf } from "./exec";

export interface DiskThroughput {
  device: string;
  kilobytesPerTransfer: number;
  transfersPerSecond: number;
  megabytesPerSecond: number;
  hasSample: boolean;
}

export interface GetDiskThroughputOptions {
  allowSlowSample?: boolean;
}

const SAMPLE_CACHE_TTL_MS = 10_000;

let cachedDevice: string | null = null;
let inFlight = false;
let lastSample: DiskThroughput | null = null;
let lastSampleAt = 0;

async function getPhysicalDiskDevice(): Promise<string> {
  if (cachedDevice) {
    return cachedDevice;
  }

  const output = await execf("/usr/sbin/diskutil", ["info", "/"]).catch(() => "");
  const physicalStore = output.match(/APFS Physical Store:\s+(\S+)/)?.[1] ?? "disk0s2";
  cachedDevice = physicalStore.replace(/s\d+$/, "");

  return cachedDevice;
}

export function parseIostatSample(output: string): Omit<DiskThroughput, "device" | "hasSample"> | null {
  const dataLines = output
    .trim()
    .split("\n")
    .filter((line) => /^\s*\d/.test(line));

  if (dataLines.length === 0) {
    return null;
  }

  const parts = dataLines[dataLines.length - 1].trim().split(/\s+/);
  if (parts.length < 3) {
    return null;
  }

  const kilobytesPerTransfer = parseFloat(parts[0]);
  const transfersPerSecond = parseFloat(parts[1]);
  const megabytesPerSecond = parseFloat(parts[2]);

  if ([kilobytesPerTransfer, transfersPerSecond, megabytesPerSecond].some(Number.isNaN)) {
    return null;
  }

  return {
    kilobytesPerTransfer,
    transfersPerSecond,
    megabytesPerSecond,
  };
}

function emptySample(device: string): DiskThroughput {
  return {
    device,
    kilobytesPerTransfer: 0,
    transfersPerSecond: 0,
    megabytesPerSecond: 0,
    hasSample: false,
  };
}

export async function getDiskThroughput(options?: GetDiskThroughputOptions): Promise<DiskThroughput> {
  const device = cachedDevice ?? (await getPhysicalDiskDevice());
  const allowSlowSample = options?.allowSlowSample ?? true;

  if (lastSample && Date.now() - lastSampleAt < SAMPLE_CACHE_TTL_MS) {
    return lastSample;
  }

  if (!allowSlowSample) {
    return lastSample ?? emptySample(device);
  }

  if (inFlight) {
    return lastSample ?? emptySample(device);
  }

  inFlight = true;

  try {
    const resolvedDevice = await getPhysicalDiskDevice();
    const output = await execf("/usr/sbin/iostat", ["-d", resolvedDevice, "1", "2"]);
    const parsed = parseIostatSample(output);

    if (!parsed) {
      return lastSample ?? emptySample(resolvedDevice);
    }

    lastSample = {
      device: resolvedDevice,
      ...parsed,
      hasSample: true,
    };
    lastSampleAt = Date.now();

    return lastSample;
  } catch {
    return lastSample ?? emptySample(device);
  } finally {
    inFlight = false;
  }
}

export function formatDiskRate(megabytesPerSecond: number): string {
  return `${megabytesPerSecond.toFixed(2)} MB/s`;
}
