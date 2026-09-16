/**
 * Multi-provider speed-test engine.
 *
 * Pure HTTP for every provider (`fetch` only) — no external binary, no brew
 * dependency. Both providers share the same measurement shape — probing →
 * downloading → uploading → done — and stream live download/upload Mbps via
 * `onProgress`.
 *
 * Providers:
 *   yandex     — Yandex Internetometer (ya.ru/internet/api/v0/*), 3 CDN nodes.
 *   cloudflare — speed.cloudflare.com __down/__up.
 *
 * v1 ships exactly these two. fast.com (Netflix CDN targets, token embedded in
 * the app bundle) and Ookla (scraped speedtest-servers.php) are intentionally
 * excluded from the shipped surface — scraping/token use can violate the
 * services' ToS (Raycast review rejection reason). Revisit when an authorized
 * client (e.g. Ookla's SDK) is in scope.
 */

import { randomBytes } from "node:crypto";

export type SpeedProvider = "yandex" | "cloudflare";

export const SPEED_PROVIDERS: SpeedProvider[] = ["yandex", "cloudflare"];

export interface SpeedProgress {
  phase: "probing" | "downloading" | "uploading" | "done";
  /** Current measured Mbps for the active phase (download or upload). */
  currentMbps: number;
}

export interface SpeedResult {
  pingMs: number;
  downloadMbps: number;
  uploadMbps: number;
  server: string;
  publicIp: string;
}

type Ctx = {
  onProgress: (p: SpeedProgress) => void;
  downloadStarted: number;
  downloadBytes: number;
  uploadStarted: number;
  uploadBytes: number;
};

const BITS_PER_BYTE = 8;
const UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB per probe/stream.

async function getJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return (await res.json()) as T;
}

/** Read a whole response body, counting bytes as it streams. */
async function countBytes(
  url: string,
  sink: (bytesDelta: number) => void,
  timeoutMs = 15_000,
): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`download probe HTTP ${res.status}`);
  const reader = res.body?.getReader();
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      sink(value.byteLength);
    }
  }
}

function reportDownload(ctx: Ctx): void {
  const secs = (performance.now() - ctx.downloadStarted) / 1000;
  ctx.onProgress({
    phase: "downloading",
    currentMbps: (ctx.downloadBytes * BITS_PER_BYTE) / secs / 1e6,
  });
}

function reportUpload(ctx: Ctx): void {
  const secs = (performance.now() - ctx.uploadStarted) / 1000;
  ctx.onProgress({
    phase: "uploading",
    currentMbps: (ctx.uploadBytes * BITS_PER_BYTE) / secs / 1e6,
  });
}

async function downloadStreams(ctx: Ctx, urls: string[]): Promise<number> {
  ctx.onProgress({ phase: "downloading", currentMbps: 0 });
  ctx.downloadStarted = performance.now();
  ctx.downloadBytes = 0;
  await Promise.all(
    urls.map((url) =>
      countBytes(url, (d) => {
        ctx.downloadBytes += d;
        reportDownload(ctx);
      }).catch(() => undefined),
    ),
  );
  const elapsed = (performance.now() - ctx.downloadStarted) / 1000;
  return ctx.downloadBytes === 0
    ? 0
    : (ctx.downloadBytes * BITS_PER_BYTE) / elapsed / 1e6;
}

async function uploadStreams(
  ctx: Ctx,
  urls: string[],
  bodyBytes = UPLOAD_BYTES,
): Promise<number> {
  ctx.onProgress({ phase: "uploading", currentMbps: 0 });
  ctx.uploadStarted = performance.now();
  ctx.uploadBytes = 0;
  const body = randomBytes(bodyBytes);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const res = await fetch(url, {
        method: "POST",
        body,
        headers: { "content-type": "application/octet-stream" },
        signal: AbortSignal.timeout(15_000),
      });
      ctx.uploadBytes += body.byteLength;
      reportUpload(ctx);
      return res.ok ? body.byteLength : 0;
    }),
  );
  const total = results.reduce(
    (acc, r) => acc + (r.status === "fulfilled" ? r.value : 0),
    0,
  );
  const elapsed = (performance.now() - ctx.uploadStarted) / 1000;
  return total === 0
    ? 0
    : (total * BITS_PER_BYTE) / Math.max(elapsed, 0.001) / 1e6;
}

async function lowestLatency(urls: string[]): Promise<number> {
  const latencies = await Promise.allSettled(
    urls.map(async (url) => {
      const started = performance.now();
      await fetch(url, {
        headers: { accept: "application/octet-stream" },
        signal: AbortSignal.timeout(5_000),
      });
      return performance.now() - started;
    }),
  );
  const values = latencies
    .filter(
      (r): r is PromiseFulfilledResult<number> => r.status === "fulfilled",
    )
    .map((r) => r.value);
  return values.length ? Math.min(...values) : 0;
}

// ---------------------------------------------------------------------------
// Yandex Internetometer
// ---------------------------------------------------------------------------

const YANDEX_BASE = "https://ya.ru/internet/api/v0";

interface YandexProbes {
  mid: string;
  latency: { probes: { url: string }[] };
  download: { probes: { url: string; timeout?: number }[] };
  upload: { probes: { postUrl: string }[] };
}

async function yandexRun(ctx: Ctx): Promise<SpeedResult> {
  ctx.onProgress({ phase: "probing", currentMbps: 0 });
  const probes = await getJson<YandexProbes>(`${YANDEX_BASE}/get-probes`);

  const server =
    probes.download.probes[0]?.url.match(
      /cdn[_-]([a-z0-9-]+?)(?:mgfn|\.)/i,
    )?.[1] ?? "yandex";

  const pingMs = await lowestLatency(probes.latency.probes.map((p) => p.url));
  const downloadMbps = await downloadStreams(
    ctx,
    probes.download.probes
      .filter((p) => p.url.includes("50mb") || !p.timeout)
      .map((p) => p.url),
  );
  const uploadMbps = await uploadStreams(
    ctx,
    probes.upload.probes.map((p) => p.postUrl),
  );

  let publicIp = "";
  try {
    const ip = await getJson<string>(
      `https://ipv4-internet.yandex.net/api/v0/ip`,
    );
    if (ip && !ip.startsWith("{")) publicIp = ip;
  } catch {
    /* non-fatal */
  }

  ctx.onProgress({ phase: "done", currentMbps: 0 });
  return { pingMs, downloadMbps, uploadMbps, server, publicIp };
}

// ---------------------------------------------------------------------------
// Cloudflare
// ---------------------------------------------------------------------------

const CF_DOWNLOAD_URL = "https://speed.cloudflare.com/__down?bytes=10000000"; // 10 MB body

async function cloudflareRun(ctx: Ctx): Promise<SpeedResult> {
  ctx.onProgress({ phase: "probing", currentMbps: 0 });
  const pingMs = await lowestLatency([CF_DOWNLOAD_URL]);
  const downloadMbps = await downloadStreams(ctx, [CF_DOWNLOAD_URL]);
  const uploadMbps = await uploadStreams(ctx, [
    "https://speed.cloudflare.com/__up",
  ]);
  ctx.onProgress({ phase: "done", currentMbps: 0 });
  return {
    pingMs,
    downloadMbps,
    uploadMbps,
    server: "Cloudflare",
    publicIp: "",
  };
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

const PROVIDERS: Record<SpeedProvider, (ctx: Ctx) => Promise<SpeedResult>> = {
  yandex: yandexRun,
  cloudflare: cloudflareRun,
};

/**
 * Run the full speed test against the given provider. Calls `onProgress` with
 * live download/upload Mbps. Resolves with the final result. Throws on any
 * hard failure (no probes, endpoint error) — the caller decides how to surface
 * it.
 */
export async function runSpeedTest(
  provider: SpeedProvider,
  onProgress: (p: SpeedProgress) => void,
): Promise<SpeedResult> {
  onProgress({ phase: "probing", currentMbps: 0 });
  const ctx: Ctx = {
    onProgress,
    downloadStarted: 0,
    downloadBytes: 0,
    uploadStarted: 0,
    uploadBytes: 0,
  };
  return PROVIDERS[provider](ctx);
}
