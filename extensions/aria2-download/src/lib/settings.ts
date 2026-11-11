import { Aria2Settings, DEFAULT_SETTINGS } from "./types";

const MIN_SPLIT_SIZE_PATTERN = /^(\d+)([KMG])$/i;

export function normalizeSettings(
  raw: Partial<Aria2Settings> | undefined,
): Aria2Settings {
  return { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
}

export function validateSettings(settings: Aria2Settings): string[] {
  const errors: string[] = [];
  const integer = (value: number, min: number, max: number, name: string) => {
    if (!Number.isInteger(value) || value < min || value > max) {
      errors.push(`${name} must be an integer between ${min} and ${max}`);
    }
  };

  integer(settings.rpcPort, 1024, 65535, "RPC port");
  integer(settings.connections, 1, 16, "Connections");
  integer(settings.split, 1, 16, "Split");
  integer(settings.maxConcurrentDownloads, 1, 10, "Max concurrent downloads");
  integer(settings.connectTimeout, 1, 600, "Connect timeout");
  integer(settings.timeout, 1, 3600, "Timeout");
  integer(settings.maxTries, 1, 100, "Max tries");
  integer(settings.retryWait, 0, 600, "Retry wait");
  integer(settings.saveSessionInterval, 10, 300, "Save session interval");
  integer(settings.listenPort, 1024, 65535, "BT listen port");
  integer(settings.dhtListenPort, 1024, 65535, "DHT listen port");
  integer(settings.btMaxPeers, 1, 1000, "BT max peers");

  if (!settings.downloadDir || !/^[a-zA-Z]:[\\/]/.test(settings.downloadDir)) {
    errors.push("Download directory must be an absolute Windows path");
  }
  if (!MIN_SPLIT_SIZE_PATTERN.test(settings.minSplitSize)) {
    errors.push("Min split size must look like 1M, 4M or 20M");
  }
  if (
    settings.fileAllocation !== "none" &&
    settings.fileAllocation !== "prealloc"
  ) {
    errors.push("File allocation must be none or prealloc");
  }
  if (!["system", "direct", "custom"].includes(settings.proxyMode)) {
    errors.push("Proxy mode must be system, direct or custom");
  }
  if (settings.proxyMode === "custom" && !settings.allProxy.trim()) {
    errors.push("Custom proxy mode requires a proxy URL");
  }
  if (settings.seedTime < 0) errors.push("Seed time cannot be negative");
  if (settings.seedRatio < 0) errors.push("Seed ratio cannot be negative");
  if (!Number.isFinite(settings.seedRatio))
    errors.push("Seed ratio must be a number");

  return errors;
}
