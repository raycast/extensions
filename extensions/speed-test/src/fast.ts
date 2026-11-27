const FAST_URL = "https://fast.com";
const FAST_API_URL = "https://api.fast.com/netflix/speedtest/v2";
const FAST_TARGET_COUNT = 5;
const SETUP_TIMEOUT_MS = 10_000;
const LATENCY_TIMEOUT_MS = 5000;
const LATENCY_SAMPLES = 8;
const PARALLEL_STREAMS = 4;
const PROGRESS_INTERVAL_MS = 200;
const MIN_MEASUREMENT_WINDOW_MS = 1000;
const DOWNLOAD = { name: "download", durationMs: 8000, warmupMs: 1000, requestBytes: 25_000_000 };
const UPLOAD = { name: "upload", durationMs: 8000, warmupMs: 2000 };
const UPLOAD_MIN_REQUEST_BYTES = 64 * 1024;
const UPLOAD_MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const UPLOAD_TARGET_REQUEST_MS = 500;

export interface SpeedTestServers {
  urls: string[];
  location: string;
}

interface FastTargetsResponse {
  targets?: { url?: string; location?: { city?: string; country?: string } }[];
}

export class SpeedTestTimeoutError extends Error {}

async function withDeadline<T>(
  signal: AbortSignal,
  timeoutMs: number,
  description: string,
  run: (deadlineSignal: AbortSignal) => Promise<T>,
): Promise<T> {
  const deadlineSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  try {
    return await run(deadlineSignal);
  } catch (error) {
    if (!signal.aborted && deadlineSignal.aborted) throw new SpeedTestTimeoutError(`${description} timed out`);
    throw error;
  }
}

async function fetchText(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

export function fetchFastServers(signal: AbortSignal): Promise<SpeedTestServers> {
  return withDeadline(signal, SETUP_TIMEOUT_MS, "Finding a fast.com test server", async (deadlineSignal) => {
    const html = await fetchText(FAST_URL, deadlineSignal);
    const scriptName = html.match(/app-[a-z0-9]+\.js/)?.[0];
    if (!scriptName) throw new Error("Couldn't find the fast.com app script");
    const script = await fetchText(`${FAST_URL}/${scriptName}`, deadlineSignal);
    const token = script.match(/token:"([A-Za-z0-9]+)"/)?.[1];
    if (!token) throw new Error("Couldn't find the fast.com API token");
    const body = JSON.parse(
      await fetchText(`${FAST_API_URL}?https=true&token=${token}&urlCount=${FAST_TARGET_COUNT}`, deadlineSignal),
    ) as FastTargetsResponse;
    const targets = (body.targets ?? []).filter((target) => typeof target.url === "string");
    if (targets.length === 0) throw new Error("fast.com returned no test servers");
    const { city, country } = targets[0].location ?? {};
    return {
      urls: targets.map((target) => target.url as string),
      location: [city, country].filter(Boolean).join(", ") || "Netflix",
    };
  });
}

function rangeUrl(serverUrl: string, bytes: number): string {
  return serverUrl.replace("/speedtest", `/speedtest/range/0-${bytes}`);
}

function toMbps(bytes: number, durationMs: number): number {
  return durationMs > 0 ? (bytes * 8) / (durationMs * 1000) : 0;
}

async function runTimedStreams(
  signal: AbortSignal,
  durationMs: number,
  stream: (streamIndex: number, streamSignal: AbortSignal) => Promise<void>,
): Promise<void> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort);
  const timer = setTimeout(abort, durationMs);
  try {
    await Promise.all(
      Array.from({ length: PARALLEL_STREAMS }, async (_, streamIndex) => {
        while (!controller.signal.aborted) await stream(streamIndex, controller.signal);
      }),
    );
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally {
    clearTimeout(timer);
    controller.abort();
    signal.removeEventListener("abort", abort);
  }
  signal.throwIfAborted();
}

/**
 * Reports the rate since the first sample taken after warmup, so connection setup and slow start do not drag down the
 * result. Shows the whole-run rate until that window is long enough and has seen bytes, so the readout does not dip.
 */
async function measureThroughputMbps(
  signal: AbortSignal,
  phase: { name: string; durationMs: number; warmupMs: number },
  onProgress: (mbps: number) => void,
  transfer: (streamIndex: number, streamSignal: AbortSignal, countBytes: (bytes: number) => void) => Promise<void>,
): Promise<number> {
  const startedAt = performance.now();
  let transferredBytes = 0;
  let baseline: { atMs: number; bytes: number } | undefined;
  const currentMbps = () => {
    const nowMs = performance.now();
    if (baseline && nowMs - baseline.atMs >= MIN_MEASUREMENT_WINDOW_MS && transferredBytes > baseline.bytes) {
      return toMbps(transferredBytes - baseline.bytes, nowMs - baseline.atMs);
    }
    if (!baseline && nowMs - startedAt >= phase.warmupMs) baseline = { atMs: nowMs, bytes: transferredBytes };
    return toMbps(transferredBytes, nowMs - startedAt);
  };
  const progressTimer = setInterval(() => onProgress(currentMbps()), PROGRESS_INTERVAL_MS);
  try {
    await runTimedStreams(signal, phase.durationMs, (streamIndex, streamSignal) =>
      transfer(streamIndex, streamSignal, (bytes) => (transferredBytes += bytes)),
    );
  } finally {
    clearInterval(progressTimer);
  }
  if (transferredBytes === 0) throw new Error(`The ${phase.name} test couldn't transfer any data`);
  return currentMbps();
}

export function measureDownloadMbps(
  servers: SpeedTestServers,
  signal: AbortSignal,
  onProgress: (mbps: number) => void,
): Promise<number> {
  return measureThroughputMbps(signal, DOWNLOAD, onProgress, async (streamIndex, streamSignal, countBytes) => {
    const serverUrl = servers.urls[streamIndex % servers.urls.length];
    const response = await fetch(rangeUrl(serverUrl, DOWNLOAD.requestBytes), { signal: streamSignal });
    if (!response.ok || !response.body) throw new Error(`Download failed with HTTP ${response.status}`);
    for await (const chunk of response.body) countBytes(chunk.byteLength);
  });
}

/**
 * Counts bytes only once the server has received a whole request, because bytes handed to the socket can sit in OS
 * buffers. Requests start small so slow connections still complete several, and grow while they finish quickly.
 */
export function measureUploadMbps(
  servers: SpeedTestServers,
  signal: AbortSignal,
  onProgress: (mbps: number) => void,
): Promise<number> {
  const requestBytesByStream = Array.from({ length: PARALLEL_STREAMS }, () => UPLOAD_MIN_REQUEST_BYTES);
  return measureThroughputMbps(signal, UPLOAD, onProgress, async (streamIndex, streamSignal, countBytes) => {
    const serverUrl = servers.urls[streamIndex % servers.urls.length];
    const requestBytes = requestBytesByStream[streamIndex];
    const startedAt = performance.now();
    const response = await fetch(rangeUrl(serverUrl, requestBytes), {
      method: "POST",
      body: new Uint8Array(requestBytes),
      signal: streamSignal,
    });
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`Upload failed with HTTP ${response.status}`);
    countBytes(requestBytes);
    if (performance.now() - startedAt < UPLOAD_TARGET_REQUEST_MS) {
      requestBytesByStream[streamIndex] = Math.min(requestBytes * 2, UPLOAD_MAX_REQUEST_BYTES);
    }
  });
}

export function measureLatencyMs(servers: SpeedTestServers, signal: AbortSignal): Promise<number> {
  return withDeadline(signal, LATENCY_TIMEOUT_MS, "Measuring latency", async (deadlineSignal) => {
    const samplesMs: number[] = [];
    for (let i = 0; i < LATENCY_SAMPLES; i++) {
      const startedAt = performance.now();
      const response = await fetch(rangeUrl(servers.urls[0], 0), { signal: deadlineSignal });
      await response.arrayBuffer();
      samplesMs.push(performance.now() - startedAt);
    }
    samplesMs.sort((a, b) => a - b);
    return samplesMs[Math.floor(samplesMs.length / 2)];
  });
}
