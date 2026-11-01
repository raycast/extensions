import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";

const FAST_URL = "https://fast.com";
const FAST_API_URL = "https://api.fast.com/netflix/speedtest/v2";
const FAST_TARGET_COUNT = 5;
const DOWNLOAD_DURATION_MS = 8000;
const DOWNLOAD_WARMUP_MS = 1000;
const UPLOAD_DURATION_MS = 6000;
const PARALLEL_STREAMS = 4;
const DOWNLOAD_REQUEST_BYTES = 25_000_000;
const UPLOAD_REQUEST_BYTES = 4_000_000;
const LATENCY_SAMPLES = 8;
const PROGRESS_INTERVAL_MS = 200;

type Phase = "download" | "upload" | "done" | "error";

interface SpeedTestServers {
  urls: string[];
  location: string;
}

interface FastTargetsResponse {
  targets?: { url?: string; location?: { city?: string; country?: string } }[];
}

async function fetchText(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

async function fetchFastServers(signal: AbortSignal): Promise<SpeedTestServers> {
  const html = await fetchText(FAST_URL, signal);
  const scriptName = html.match(/app-[a-z0-9]+\.js/)?.[0];
  if (!scriptName) throw new Error("Couldn't find the fast.com app script");
  const token = (await fetchText(`${FAST_URL}/${scriptName}`, signal)).match(/token:"([A-Za-z0-9]+)"/)?.[1];
  if (!token) throw new Error("Couldn't find the fast.com API token");
  const body = JSON.parse(
    await fetchText(`${FAST_API_URL}?https=true&token=${token}&urlCount=${FAST_TARGET_COUNT}`, signal),
  ) as FastTargetsResponse;
  const targets = (body.targets ?? []).filter((target) => typeof target.url === "string");
  if (targets.length === 0) throw new Error("fast.com returned no test servers");
  const { city, country } = targets[0].location ?? {};
  return {
    urls: targets.map((target) => target.url as string),
    location: [city, country].filter(Boolean).join(", ") || "Netflix",
  };
}

function rangeUrl(serverUrl: string, bytes: number): string {
  return serverUrl.replace("/speedtest", `/speedtest/range/0-${bytes}`);
}

function toMbps(bytes: number, durationMs: number): number {
  return durationMs > 0 ? (bytes * 8) / (durationMs * 1000) : 0;
}

function formatMbps(value: number): string {
  return value < 10 ? value.toFixed(1) : Math.round(value).toString();
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

async function measureDownloadMbps(
  servers: SpeedTestServers,
  signal: AbortSignal,
  onProgress: (mbps: number) => void,
): Promise<number> {
  const startedAt = performance.now();
  let receivedBytes = 0;
  let warmupBytes = 0;
  const currentMbps = () => {
    const elapsedMs = performance.now() - startedAt;
    if (elapsedMs < DOWNLOAD_WARMUP_MS) return toMbps(receivedBytes, elapsedMs);
    if (warmupBytes === 0) warmupBytes = receivedBytes;
    return toMbps(receivedBytes - warmupBytes, elapsedMs - DOWNLOAD_WARMUP_MS);
  };
  const progressTimer = setInterval(() => onProgress(currentMbps()), PROGRESS_INTERVAL_MS);
  try {
    await runTimedStreams(signal, DOWNLOAD_DURATION_MS, async (streamIndex, streamSignal) => {
      const serverUrl = servers.urls[streamIndex % servers.urls.length];
      const response = await fetch(rangeUrl(serverUrl, DOWNLOAD_REQUEST_BYTES), { signal: streamSignal });
      if (!response.ok || !response.body) throw new Error(`Download failed with HTTP ${response.status}`);
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        receivedBytes += value.byteLength;
      }
    });
  } finally {
    clearInterval(progressTimer);
  }
  return currentMbps();
}

async function measureUploadMbps(servers: SpeedTestServers, signal: AbortSignal): Promise<number> {
  const payload = new Uint8Array(UPLOAD_REQUEST_BYTES);
  const startedAt = performance.now();
  let sentBytes = 0;
  let lastCompletedAt = startedAt;
  await runTimedStreams(signal, UPLOAD_DURATION_MS, async (streamIndex, streamSignal) => {
    const serverUrl = servers.urls[streamIndex % servers.urls.length];
    const response = await fetch(rangeUrl(serverUrl, UPLOAD_REQUEST_BYTES), {
      method: "POST",
      body: payload,
      signal: streamSignal,
    });
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`Upload failed with HTTP ${response.status}`);
    sentBytes += UPLOAD_REQUEST_BYTES;
    lastCompletedAt = performance.now();
  });
  return toMbps(sentBytes, lastCompletedAt - startedAt);
}

async function measureLatencyMs(servers: SpeedTestServers, signal: AbortSignal): Promise<number> {
  const samplesMs: number[] = [];
  for (let i = 0; i < LATENCY_SAMPLES; i++) {
    const startedAt = performance.now();
    const response = await fetch(rangeUrl(servers.urls[0], 0), { signal });
    await response.arrayBuffer();
    samplesMs.push(performance.now() - startedAt);
  }
  samplesMs.sort((a, b) => a - b);
  return samplesMs[Math.floor(samplesMs.length / 2)];
}

export default function Command() {
  const [runId, setRunId] = useState(0);
  const [phase, setPhase] = useState<Phase>("download");
  const [downloadMbps, setDownloadMbps] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number>();
  const [uploadMbps, setUploadMbps] = useState<number>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [serverLocation, setServerLocation] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setPhase("download");
    setDownloadMbps(0);
    setLatencyMs(undefined);
    setUploadMbps(undefined);
    setErrorMessage(undefined);
    (async () => {
      const servers = await fetchFastServers(controller.signal);
      setServerLocation(servers.location);
      setDownloadMbps(await measureDownloadMbps(servers, controller.signal, setDownloadMbps));
      setPhase("upload");
      setLatencyMs(await measureLatencyMs(servers, controller.signal));
      setUploadMbps(await measureUploadMbps(servers, controller.signal));
      setPhase("done");
    })().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    });
    return () => controller.abort();
  }, [runId]);

  const isTesting = phase === "download" || phase === "upload";
  const status = { download: "Testing download…", upload: "Measuring latency and upload…", done: "Done", error: "" }[
    phase
  ];
  const markdown =
    phase === "error" ? `# Speed test failed\n\n${errorMessage}` : `# ${formatMbps(downloadMbps)} Mbps\n\n${status}`;
  const summary = [
    `Download: ${formatMbps(downloadMbps)} Mbps`,
    uploadMbps !== undefined && `Upload: ${formatMbps(uploadMbps)} Mbps`,
    latencyMs !== undefined && `Latency: ${Math.round(latencyMs)} ms`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      isLoading={isTesting}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Download" text={`${formatMbps(downloadMbps)} Mbps`} />
          <Detail.Metadata.Label
            title="Upload"
            text={uploadMbps === undefined ? "…" : `${formatMbps(uploadMbps)} Mbps`}
          />
          <Detail.Metadata.Label title="Latency" text={latencyMs === undefined ? "…" : `${Math.round(latencyMs)} ms`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Server" text={serverLocation ?? "…"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Run Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => setRunId((id) => id + 1)}
          />
          <Action.CopyToClipboard title="Copy Results" content={summary} />
        </ActionPanel>
      }
    />
  );
}
