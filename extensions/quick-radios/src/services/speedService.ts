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
interface StoredBaseline {
  ssid: string;
  baselineIn: number;
  baselineOut: number;
}

let activeBaseline: StoredBaseline | undefined;

export function calculateSessionUsage(
  ssid: string | undefined,
  currentBytesIn: number,
  currentBytesOut: number,
): SessionDataUsage {
  if (!ssid || (currentBytesIn === 0 && currentBytesOut === 0)) {
    return {
      downloadedBytes: 0,
      uploadedBytes: 0,
      totalBytesIn: currentBytesIn,
      totalBytesOut: currentBytesOut,
    };
  }

  // If new network or baseline not set yet
  if (!activeBaseline || activeBaseline.ssid !== ssid) {
    activeBaseline = {
      ssid,
      baselineIn: 0,
      baselineOut: 0,
    };
  }

  const downloadedBytes = Math.max(
    0,
    currentBytesIn - activeBaseline.baselineIn,
  );
  const uploadedBytes = Math.max(
    0,
    currentBytesOut - activeBaseline.baselineOut,
  );

  return {
    downloadedBytes,
    uploadedBytes,
    totalBytesIn: currentBytesIn,
    totalBytesOut: currentBytesOut,
  };
}

export function formatGigaBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}
