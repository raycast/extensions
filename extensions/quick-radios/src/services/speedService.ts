import { Cache } from "@raycast/api";

export interface InternetSpeedResult {
  downloadMbps: number;
  uploadMbps: number;
  timestamp: number;
}

export interface SessionDataUsage {
  downloadedBytes: number;
  uploadedBytes: number;
  totalBytesIn: number;
  totalBytesOut: number;
}

let cachedSpeed: InternetSpeedResult | undefined;
let isSpeedTestRunning = false;

/**
 * Measures actual internet download speed by streaming bytes from Cloudflare CDN.
 */
async function measureDownloadSpeed(
  bytes = 3.5 * 1024 * 1024,
): Promise<number | undefined> {
  try {
    const t0 = Date.now();
    const res = await fetch(
      `https://speed.cloudflare.com/__down?bytes=${bytes}`,
      { signal: AbortSignal.timeout(3500) },
    );
    if (!res.ok) return undefined;
    const buffer = await res.arrayBuffer();
    const durationSec = (Date.now() - t0) / 1000;
    if (durationSec > 0 && buffer.byteLength > 0) {
      const mbps = (buffer.byteLength * 8) / (durationSec * 1_000_000);
      return Math.round(mbps * 10) / 10;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Measures actual internet upload speed by sending a payload to Cloudflare CDN.
 */
async function measureUploadSpeed(
  bytes = 1024 * 1024,
): Promise<number | undefined> {
  try {
    const t0 = Date.now();
    const res = await fetch("https://speed.cloudflare.com/__up", {
      method: "POST",
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return undefined;
    const durationSec = (Date.now() - t0) / 1000;
    if (durationSec > 0) {
      const mbps = (bytes * 8) / (durationSec * 1_000_000);
      return Math.round(mbps * 10) / 10;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Runs a fast, accurate internet speed test measuring download and upload speeds.
 */
export async function getInternetSpeed(
  force = false,
): Promise<InternetSpeedResult | undefined> {
  const now = Date.now();
  if (!force && cachedSpeed && now - cachedSpeed.timestamp < 120000) {
    return cachedSpeed;
  }

  if (isSpeedTestRunning && cachedSpeed) {
    return cachedSpeed;
  }

  isSpeedTestRunning = true;
  try {
    const [down, up] = await Promise.all([
      measureDownloadSpeed(),
      measureUploadSpeed(),
    ]);

    if (down !== undefined && up !== undefined) {
      cachedSpeed = {
        downloadMbps: down,
        uploadMbps: up,
        timestamp: Date.now(),
      };
      return cachedSpeed;
    }
    return cachedSpeed;
  } finally {
    isSpeedTestRunning = false;
  }
}

/**
 * Returns the currently cached speed result if still fresh (< 2 minutes).
 */
export function getCachedInternetSpeed(): InternetSpeedResult | undefined {
  if (cachedSpeed && Date.now() - cachedSpeed.timestamp < 120000) {
    return cachedSpeed;
  }
  return undefined;
}

/**
 * Tracks session baseline data usage for a specific Wi-Fi SSID connection.
 */
export interface StoredBaseline {
  ssid: string;
  baselineIn: number;
  baselineOut: number;
  firstObservedTime: number;
  lastUpdatedTime: number;
}

const sessionCache = new Cache({ namespace: "wifi-session-usage" });
const LAST_SSID_KEY = "__active_ssid__";
let activeBaseline: StoredBaseline | undefined;

export function calculateSessionUsage(
  ssid: string | undefined,
  currentBytesIn: number,
  currentBytesOut: number,
): SessionDataUsage {
  const safeBytesIn =
    Number.isFinite(currentBytesIn) && currentBytesIn >= 0
      ? Math.floor(currentBytesIn)
      : 0;
  const safeBytesOut =
    Number.isFinite(currentBytesOut) && currentBytesOut >= 0
      ? Math.floor(currentBytesOut)
      : 0;

  if (!ssid) {
    return {
      downloadedBytes: 0,
      uploadedBytes: 0,
      totalBytesIn: safeBytesIn,
      totalBytesOut: safeBytesOut,
    };
  }

  const now = Date.now();
  let baseline: StoredBaseline | undefined;

  try {
    const lastActiveSsid = sessionCache.get(LAST_SSID_KEY);
    const cachedStr = sessionCache.get(ssid);
    if (cachedStr) {
      try {
        baseline = JSON.parse(cachedStr) as StoredBaseline;
      } catch {
        baseline = undefined;
      }
    }

    const isSsidSwitched =
      lastActiveSsid !== undefined && lastActiveSsid !== ssid;
    const countersWrapped =
      baseline !== undefined &&
      (safeBytesIn < baseline.baselineIn ||
        safeBytesOut < baseline.baselineOut);

    if (!baseline || isSsidSwitched || countersWrapped) {
      baseline = {
        ssid,
        baselineIn: safeBytesIn,
        baselineOut: safeBytesOut,
        firstObservedTime: now,
        lastUpdatedTime: now,
      };
      sessionCache.set(ssid, JSON.stringify(baseline));
    } else {
      baseline.lastUpdatedTime = now;
      sessionCache.set(ssid, JSON.stringify(baseline));
    }

    sessionCache.set(LAST_SSID_KEY, ssid);
    activeBaseline = baseline;
  } catch {
    // If Cache encounters an issue, fallback gracefully to in-memory state
    if (
      !activeBaseline ||
      activeBaseline.ssid !== ssid ||
      safeBytesIn < activeBaseline.baselineIn ||
      safeBytesOut < activeBaseline.baselineOut
    ) {
      activeBaseline = {
        ssid,
        baselineIn: safeBytesIn,
        baselineOut: safeBytesOut,
        firstObservedTime: now,
        lastUpdatedTime: now,
      };
    } else {
      activeBaseline.lastUpdatedTime = now;
    }
    baseline = activeBaseline;
  }

  const downloadedBytes = Math.max(0, safeBytesIn - baseline.baselineIn);
  const uploadedBytes = Math.max(0, safeBytesOut - baseline.baselineOut);

  return {
    downloadedBytes,
    uploadedBytes,
    totalBytesIn: safeBytesIn,
    totalBytesOut: safeBytesOut,
  };
}

/**
 * Dynamically formats byte counts into human-readable strings (B, KB, MB, GB, TB, PB)
 * with adaptive decimal precision.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let unitIndex = 0;
  let val = bytes;

  while (val >= 1024 && unitIndex < units.length - 1) {
    val /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    if (Math.round(val) >= 1024) {
      return "1.00 KB";
    }
    return `${Math.round(val)} B`;
  }

  if (parseFloat(val.toFixed(2)) >= 1024 && unitIndex < units.length - 1) {
    val /= 1024;
    unitIndex++;
  }

  return `${val.toFixed(2)} ${units[unitIndex]}`;
}

export function formatGigaBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}
