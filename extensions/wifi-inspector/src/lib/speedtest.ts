export interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  /** ISO timestamp when the test finished. */
  measuredAt: string;
  /** Edge / method label for the UI. */
  provider: string;
}

export class SpeedTestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpeedTestError";
  }
}

const DOWNLOAD_URL = "https://speed.cloudflare.com/__down";
const UPLOAD_URL = "https://speed.cloudflare.com/__up";

export type SpeedTestPhase = "latency" | "download" | "upload";

export interface SpeedTestProgress {
  phase: SpeedTestPhase;
  message: string;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function bytesToMbps(bytes: number, durationMs: number): number {
  if (durationMs <= 0) {
    return 0;
  }
  return (bytes * 8) / (durationMs / 1000) / 1_000_000;
}

async function measureLatencyMs(samples = 5): Promise<number> {
  const timings: number[] = [];
  for (let i = 0; i < samples; i++) {
    const started = performance.now();
    const response = await fetch(`${DOWNLOAD_URL}?bytes=0&r=${Date.now()}-${i}`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new SpeedTestError(`Latency probe failed (${response.status}).`);
    }
    await response.arrayBuffer();
    timings.push(performance.now() - started);
  }
  return median(timings);
}

async function measureDownloadMbps(byteSizes: number[]): Promise<number> {
  const rates: number[] = [];
  for (const size of byteSizes) {
    const started = performance.now();
    const response = await fetch(`${DOWNLOAD_URL}?bytes=${size}&r=${Date.now()}`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new SpeedTestError(`Download test failed (${response.status}).`);
    }
    const buffer = await response.arrayBuffer();
    const elapsed = performance.now() - started;
    rates.push(bytesToMbps(buffer.byteLength, elapsed));
  }
  return Math.max(...rates);
}

async function measureUploadMbps(byteSizes: number[]): Promise<number> {
  const rates: number[] = [];
  for (const size of byteSizes) {
    const body = Buffer.alloc(size, 0x61);
    const started = performance.now();
    const response = await fetch(`${UPLOAD_URL}?r=${Date.now()}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body,
    });
    if (!response.ok) {
      throw new SpeedTestError(`Upload test failed (${response.status}).`);
    }
    await response.arrayBuffer();
    const elapsed = performance.now() - started;
    rates.push(bytesToMbps(size, elapsed));
  }
  return Math.max(...rates);
}

/**
 * Lightweight Cloudflare edge speed test (download / upload / idle latency).
 * No external CLI — runs entirely inside the Raycast Node runtime.
 */
export async function runSpeedTest(onProgress?: (progress: SpeedTestProgress) => void): Promise<SpeedTestResult> {
  try {
    onProgress?.({ phase: "latency", message: "Measuring latency…" });
    const latencyMs = await measureLatencyMs(5);

    onProgress?.({ phase: "download", message: "Measuring download…" });
    // Warm-up + progressively larger payloads; report peak observed Mbps.
    const downloadMbps = await measureDownloadMbps([250_000, 1_000_000, 5_000_000, 10_000_000]);

    onProgress?.({ phase: "upload", message: "Measuring upload…" });
    const uploadMbps = await measureUploadMbps([250_000, 1_000_000, 5_000_000]);

    return {
      downloadMbps,
      uploadMbps,
      latencyMs,
      measuredAt: new Date().toISOString(),
      provider: "Cloudflare",
    };
  } catch (error) {
    if (error instanceof SpeedTestError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new SpeedTestError(`Speed test failed: ${message}`);
  }
}

export function formatMbps(mbps: number): string {
  if (mbps >= 100) {
    return `${Math.round(mbps)} Mbps`;
  }
  if (mbps >= 10) {
    return `${mbps.toFixed(1)} Mbps`;
  }
  return `${mbps.toFixed(2)} Mbps`;
}

export function formatLatency(ms: number): string {
  if (ms >= 100) {
    return `${Math.round(ms)} ms`;
  }
  return `${ms.toFixed(1)} ms`;
}

/** Demo fixture for Store screenshots. */
export const DEMO_SPEED_RESULT: SpeedTestResult = {
  downloadMbps: 312.4,
  uploadMbps: 48.6,
  latencyMs: 12.3,
  measuredAt: new Date().toISOString(),
  provider: "Cloudflare",
};
