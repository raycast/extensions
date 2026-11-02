import { useSyncExternalStore } from "react";
import { YtdlpEvent } from "./progress.js";

/** What is being downloaded; decides the stages, the counter wording and the accent color. */
export type DownloadKind = "video" | "audio" | "gallery" | "spotify" | "website" | "transcript" | "thumbnail";

export type DownloadStatus = "running" | "done" | "failed" | "cancelled";

export type StageKey = "prepare" | "download" | "video" | "audio" | "process" | "done";

export type Stage = { key: StageKey; title: string };

/** Details about the media, from the yt-dlp metadata the form already fetched. */
export type MediaMeta = {
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  source?: string;
};

export type DownloadInit = {
  kind: DownloadKind;
  url: string;
  folder: string;
  title?: string;
  /** Human-readable choice, e.g. "1080p · MP4" or "FLAC". */
  format?: string;
  meta?: MediaMeta;
};

export type DownloadSnapshot = DownloadInit & {
  status: DownloadStatus;
  stage: StageKey;
  /** Streams yt-dlp will fetch (2 when video and audio are downloaded separately and merged). */
  streams: number;
  /** 1-based index of the stream downloading now; 0 before the first one starts. */
  streamIndex: number;
  /** Size of each stream once yt-dlp knows it, indexed like `streamIndex - 1`. */
  streamBytes: number[];
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  eta?: number;
  /** Throughput samples in bytes per second, oldest first. */
  speedSamples: number[];
  /** When the first and the latest progress update arrived; bounds the average speed. */
  firstProgressAt?: number;
  lastProgressAt?: number;
  /** Files or tracks saved so far (gallery-dl, spotDL). */
  items: number;
  /** Cumulative `items`, sampled over time. */
  itemSamples: number[];
  startedAt: number;
  finishedAt?: number;
  filePath?: string;
  /** Final headline and detail, mirrored from the toast. */
  resultTitle?: string;
  resultMessage?: string;
};

/** Minimum gap between chart samples, and between re-renders while progress streams in. */
const SAMPLE_INTERVAL_MS = 250;
const RENDER_INTERVAL_MS = 150;
/** Charts get halved in resolution past this many samples, so a long download stays cheap to draw. */
const MAX_SAMPLES = 240;
/**
 * Time constant of the shown speed's moving average. yt-dlp's readings swing
 * wildly from one update to the next; this rides those out while still
 * following a real change within a few seconds.
 */
export const SPEED_SMOOTHING_MS = 5000;

/** Seconds left at `speed`: from the bytes still to fetch when the size is known, else yt-dlp's own estimate. */
function timeLeft(p: { downloadedBytes?: number; totalBytes?: number; eta?: number }, speed?: number) {
  if (p.totalBytes !== undefined && p.downloadedBytes !== undefined && speed !== undefined && speed > 0) {
    return Math.max(0, p.totalBytes - p.downloadedBytes) / speed;
  }
  return p.eta;
}

function pushSample(samples: number[], value: number): number[] {
  const next = [...samples, value];
  if (next.length <= MAX_SAMPLES) return next;
  // Average neighbours instead of dropping them so peaks still show up.
  const halved: number[] = [];
  for (let i = 0; i < next.length; i += 2) {
    halved.push(i + 1 < next.length ? (next[i] + next[i + 1]) / 2 : next[i]);
  }
  return halved;
}

/** Sum of every stream size yt-dlp has announced so far. */
export function knownTotalBytes(s: DownloadSnapshot): number | undefined {
  const sizes = s.streamBytes.filter((b): b is number => typeof b === "number");
  return sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) : undefined;
}

/** The stages shown in the view's step strip, in order. */
export function stagesFor(kind: DownloadKind, streams: number): Stage[] {
  const prepare: Stage = { key: "prepare", title: "Prepare" };
  const done: Stage = { key: "done", title: "Saved" };
  switch (kind) {
    case "video":
      return streams > 1
        ? [
            prepare,
            { key: "video", title: "Video" },
            { key: "audio", title: "Audio" },
            { key: "process", title: "Merge" },
            done,
          ]
        : [prepare, { key: "download", title: "Download" }, { key: "process", title: "Process" }, done];
    case "audio":
      return [prepare, { key: "download", title: "Download" }, { key: "process", title: "Convert" }, done];
    case "website":
      return [prepare, { key: "download", title: "Save Page" }, done];
    case "transcript":
      return [prepare, { key: "download", title: "Extract" }, done];
    default:
      return [prepare, { key: "download", title: "Download" }, done];
  }
}

/**
 * One download, observable by the view. The form owns the child process and
 * feeds this session from its progress callbacks; the view only reads it. That
 * way going back to the form (Esc) keeps the download running, and the toast
 * stays the source of truth for anyone who closed the view.
 */
export class DownloadSession {
  private snapshot: DownloadSnapshot;
  private listeners = new Set<() => void>();
  private stopHandler?: () => void;
  private lastSampleAt = 0;
  private smoothedSpeed?: number;
  private lastSpeedAt = 0;
  private renderTimer?: ReturnType<typeof setTimeout>;

  constructor(init: DownloadInit, now = Date.now()) {
    this.snapshot = {
      ...init,
      status: "running",
      stage: "prepare",
      streams: 1,
      streamIndex: 0,
      streamBytes: [],
      speedSamples: [],
      items: 0,
      itemSamples: [],
      startedAt: now,
    };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DownloadSnapshot => this.snapshot;

  /** The form hands over its abort; the view's Stop action calls it. */
  onStop(handler: () => void) {
    this.stopHandler = handler;
  }

  stop() {
    if (this.snapshot.status === "running") this.stopHandler?.();
  }

  get canStop(): boolean {
    return this.snapshot.status === "running" && this.stopHandler !== undefined;
  }

  /** Feed a parsed yt-dlp event. */
  ytdlp(event: YtdlpEvent, now = Date.now()) {
    const s = this.snapshot;
    switch (event.type) {
      case "formats":
        this.update({ streams: Math.max(1, event.streams) });
        return;
      case "stream-start":
      case "stream-skipped": {
        const streamIndex = s.streamIndex + 1;
        this.update(
          { streamIndex, stage: this.streamStage(streamIndex), percent: event.type === "stream-skipped" ? 100 : 0 },
          true,
        );
        return;
      }
      case "postprocess":
        if (s.stage !== "process") this.update({ stage: "process", percent: undefined, eta: undefined }, true);
        return;
      case "progress": {
        const p = event.progress;
        // Speed and time left are shown smoothed; the chart keeps the raw readings.
        const speed = this.smoothSpeed(p.speed, now);
        const patch: Partial<DownloadSnapshot> = { ...p, speed, eta: timeLeft(p, speed), lastProgressAt: now };
        if (s.firstProgressAt === undefined) patch.firstProgressAt = now;
        // Progress before any Destination line (e.g. single-file extractors) still means downloading.
        if (s.stage === "prepare") patch.stage = this.streamStage(Math.max(1, s.streamIndex));
        if (s.streamIndex === 0) patch.streamIndex = 1;
        if (p.totalBytes !== undefined) {
          const streamBytes = [...s.streamBytes];
          streamBytes[Math.max(1, s.streamIndex) - 1] = p.totalBytes;
          patch.streamBytes = streamBytes;
        }
        if (p.speed !== undefined && now - this.lastSampleAt >= SAMPLE_INTERVAL_MS) {
          this.lastSampleAt = now;
          patch.speedSamples = pushSample(s.speedSamples, p.speed);
        }
        this.update(patch);
        return;
      }
    }
  }

  /** Feed a file/track counter (gallery-dl, spotDL). */
  count(items: number, now = Date.now()) {
    const patch: Partial<DownloadSnapshot> = { items, stage: "download" };
    if (now - this.lastSampleAt >= SAMPLE_INTERVAL_MS) {
      this.lastSampleAt = now;
      patch.itemSamples = pushSample(this.snapshot.itemSamples, items);
    }
    this.update(patch);
  }

  /** Mark a runner without progress output (monolith, transcripts, thumbnails) as working. */
  working() {
    this.update({ stage: "download" }, true);
  }

  succeed(result: { filePath?: string; title?: string; message?: string }, now = Date.now()) {
    const s = this.snapshot;
    this.update(
      {
        status: "done",
        stage: "done",
        percent: 100,
        eta: undefined,
        finishedAt: now,
        filePath: result.filePath,
        resultTitle: result.title,
        resultMessage: result.message,
        // Keep the final count on the chart even when it landed between two samples.
        itemSamples: s.items > 0 && s.itemSamples.at(-1) !== s.items ? [...s.itemSamples, s.items] : s.itemSamples,
      },
      true,
    );
  }

  fail(result: { title?: string; message?: string; cancelled?: boolean }, now = Date.now()) {
    this.update(
      {
        status: result.cancelled ? "cancelled" : "failed",
        eta: undefined,
        finishedAt: now,
        resultTitle: result.title,
        resultMessage: result.message,
      },
      true,
    );
  }

  /** Fold a speed reading into a time-weighted moving average. A missing reading keeps the last average. */
  private smoothSpeed(raw: number | undefined, now: number): number | undefined {
    if (raw === undefined) return this.smoothedSpeed;
    if (this.smoothedSpeed === undefined) {
      this.smoothedSpeed = raw;
    } else {
      const alpha = 1 - Math.exp(-Math.max(0, now - this.lastSpeedAt) / SPEED_SMOOTHING_MS);
      this.smoothedSpeed += alpha * (raw - this.smoothedSpeed);
    }
    this.lastSpeedAt = now;
    return this.smoothedSpeed;
  }

  private streamStage(streamIndex: number): StageKey {
    const { kind, streams } = this.snapshot;
    if (kind === "video" && streams > 1) return streamIndex <= 1 ? "video" : "audio";
    return "download";
  }

  private update(patch: Partial<DownloadSnapshot>, immediate = false) {
    this.snapshot = { ...this.snapshot, ...patch };
    if (immediate) {
      this.flush();
    } else if (!this.renderTimer) {
      // Progress can arrive dozens of times per second; the view only needs a few frames.
      this.renderTimer = setTimeout(() => this.flush(), RENDER_INTERVAL_MS);
    }
  }

  private flush() {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = undefined;
    }
    for (const listener of this.listeners) listener();
  }
}

/** Subscribe a component to a session; re-renders on every (throttled) update. */
export function useDownloadSession(session: DownloadSession): DownloadSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot);
}
