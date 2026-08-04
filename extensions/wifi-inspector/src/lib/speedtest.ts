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

const LATENCY_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 30_000;
const OVERALL_TIMEOUT_MS = 120_000;

export type SpeedTestPhase = "latency" | "download" | "upload";

export interface SpeedTestProgress {
  phase: SpeedTestPhase;
  message: string;
}

export interface SpeedTestOptions {
  /** Cancel the in-flight test (e.g. when the Raycast view unmounts). */
  signal?: AbortSignal;
  onProgress?: (progress: SpeedTestProgress) => void;
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

function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => {
    controller.abort();
  };
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

function timeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Avoid keeping the event loop alive solely for this timer in long sessions.
  if (typeof timer === "object" && "unref" in timer && typeof timer.unref === "function") {
    timer.unref();
  }
  return controller.signal;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  outerSignal?: AbortSignal,
): Promise<Response> {
  const signal = outerSignal ? combineSignals([outerSignal, timeoutSignal(timeoutMs)]) : timeoutSignal(timeoutMs);

  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    if (outerSignal?.aborted) {
      throw new SpeedTestError("Speed test cancelled.");
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new SpeedTestError(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw error;
  }
}

async function measureLatencyMs(samples = 5, signal?: AbortSignal): Promise<number> {
  const timings: number[] = [];
  for (let i = 0; i < samples; i++) {
    const started = performance.now();
    const response = await fetchWithTimeout(
      `${DOWNLOAD_URL}?bytes=0&r=${Date.now()}-${i}`,
      { method: "GET" },
      LATENCY_TIMEOUT_MS,
      signal,
    );
    if (!response.ok) {
      throw new SpeedTestError(`Latency probe failed (${response.status}).`);
    }
    await response.arrayBuffer();
    timings.push(performance.now() - started);
  }
  return median(timings);
}

async function measureDownloadMbps(byteSizes: number[], signal?: AbortSignal): Promise<number> {
  const rates: number[] = [];
  for (const size of byteSizes) {
    const started = performance.now();
    const response = await fetchWithTimeout(
      `${DOWNLOAD_URL}?bytes=${size}&r=${Date.now()}`,
      { method: "GET" },
      DOWNLOAD_TIMEOUT_MS,
      signal,
    );
    if (!response.ok) {
      throw new SpeedTestError(`Download test failed (${response.status}).`);
    }
    const buffer = await response.arrayBuffer();
    const elapsed = performance.now() - started;
    rates.push(bytesToMbps(buffer.byteLength, elapsed));
  }
  return Math.max(...rates);
}

async function measureUploadMbps(byteSizes: number[], signal?: AbortSignal): Promise<number> {
  const rates: number[] = [];
  for (const size of byteSizes) {
    const body = Buffer.alloc(size, 0x61);
    const started = performance.now();
    const response = await fetchWithTimeout(
      `${UPLOAD_URL}?r=${Date.now()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body,
      },
      UPLOAD_TIMEOUT_MS,
      signal,
    );
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
export async function runSpeedTest(options: SpeedTestOptions = {}): Promise<SpeedTestResult> {
  const { onProgress, signal } = options;
  const overallSignal = signal
    ? combineSignals([signal, timeoutSignal(OVERALL_TIMEOUT_MS)])
    : timeoutSignal(OVERALL_TIMEOUT_MS);

  try {
    onProgress?.({ phase: "latency", message: "Measuring latency…" });
    const latencyMs = await measureLatencyMs(5, overallSignal);

    onProgress?.({ phase: "download", message: "Measuring download…" });
    // Warm-up + progressively larger payloads; report peak observed Mbps.
    const downloadMbps = await measureDownloadMbps([250_000, 1_000_000, 5_000_000, 10_000_000], overallSignal);

    onProgress?.({ phase: "upload", message: "Measuring upload…" });
    const uploadMbps = await measureUploadMbps([250_000, 1_000_000, 5_000_000], overallSignal);

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
