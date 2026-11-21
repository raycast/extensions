import { runCommand } from "./command-runner";

export interface FrameSelectionDiagnostic {
  requestedTitleSec: number;
  sourceTargetPTS: number;
  selectedPTS: number;
  selectedTitleSec: number;
  selectedPtsTicks: number;
  timeBase: string;
  fps: number;
  toleranceSec: number;
  errorSec: number;
  isKeyframe: boolean;
  decodedPTS?: number;
  /** Offset added to the player time to reach the source clock (container start_time). */
  sourceStartSec?: number;
  policy: "displayed-pts";
}

/**
 * Players (mpv/IINA, Infuse, Jellyfin clients) report positions relative to the
 * container start_time, i.e. the earliest start across all streams. This is also
 * what `ffmpeg -ss T -i file` adds internally, which is why the old ffmpeg-only
 * scripts landed on the right frame. Using the video stream's own start_time
 * instead shifts every capture by (video start - container start).
 */
export function pickSourceStart(meta: {
  format?: { start_time?: string };
  streams?: Array<{ start_time?: string }>;
}): number {
  const candidates = [meta.format?.start_time, meta.streams?.[0]?.start_time];
  for (const raw of candidates) {
    if (raw === undefined || raw === "N/A") continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function rational(value: string): number {
  const [n, d] = value.split("/").map(Number);
  return n / d;
}

/** Decode a bounded window; packet/keyframe timestamps alone cannot identify the displayed frame. */
export async function selectDisplayedFrame(input: {
  ffprobePath: string;
  mediaPath: string;
  requestedTitleSec: number;
  sourceTargetPTS?: number;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}): Promise<FrameSelectionDiagnostic> {
  if (!Number.isFinite(input.requestedTitleSec) || input.requestedTitleSec < 0) {
    throw new Error("The player didn't report a valid capture time.");
  }
  const metadata = await runCommand(
    input.ffprobePath,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=avg_frame_rate,time_base,start_time:format=start_time",
      "-of",
      "json",
      input.mediaPath,
    ],
    { env: input.env, timeout: input.timeoutMs ?? 30000, maxBuffer: 1024 * 1024 },
  );
  const meta = JSON.parse(metadata.stdout);
  const stream = meta.streams?.[0];
  const timeBase = stream?.time_base;
  const tick = typeof timeBase === "string" ? rational(timeBase) : NaN;
  const fps = rational(stream?.avg_frame_rate || "0/0");
  const start = pickSourceStart(meta);
  const target = input.sourceTargetPTS ?? input.requestedTitleSec + start;
  if (!Number.isFinite(target) || !Number.isFinite(tick) || tick <= 0) {
    throw new Error("The video source has an invalid timeline.");
  }
  const decoded = await runCommand(
    input.ffprobePath,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-read_intervals",
      `${Math.max(0, target - 8).toFixed(6)}%${(target + 2).toFixed(6)}`,
      "-show_entries",
      "frame=best_effort_timestamp,best_effort_timestamp_time,key_frame",
      "-of",
      "json",
      input.mediaPath,
    ],
    { env: input.env, timeout: input.timeoutMs ?? 60000, maxBuffer: 16 * 1024 * 1024 },
  );
  const frames = (JSON.parse(decoded.stdout).frames || [])
    .map((f: { best_effort_timestamp?: number; best_effort_timestamp_time?: string; key_frame?: number }) => ({
      pts: Number(f.best_effort_timestamp_time),
      ticks: Number(f.best_effort_timestamp),
      key: f.key_frame === 1,
    }))
    .filter((f: { pts: number; ticks: number }) => Number.isFinite(f.pts) && Number.isSafeInteger(f.ticks))
    .sort((a: { pts: number }, b: { pts: number }) => a.pts - b.pts) as Array<{
    pts: number;
    ticks: number;
    key: boolean;
  }>;
  if (!frames.length) throw new Error("No valid video frames were decoded near the target time.");
  // A paused player shows the frame whose display interval contains the
  // reported time, i.e. the last frame with PTS <= target (screen-matched with
  // VidHub on MKV, TS and ISO; "nearest" picked the next frame whenever the
  // report was past mid-frame). Reports can be rounded a hair below the real
  // PTS (Jellyfin ticks, millisecond MKV timestamps), so allow a small slack.
  const gapsAll = frames
    .slice(1)
    .map((f, i) => f.pts - frames[i].pts)
    .filter((g) => g > 0)
    .sort((a, b) => a - b);
  const nominal = Number.isFinite(fps) && fps > 0 ? 1 / fps : (gapsAll[Math.floor(gapsAll.length / 2)] ?? NaN);
  const slack = Math.min(Math.max(0.001, 2 * tick), Number.isFinite(nominal) ? nominal / 4 : 0.001);
  const next = frames.findIndex((f) => f.pts > target + slack);
  const index = next < 0 ? frames.length - 1 : next - 1;
  if (index < 0)
    throw new Error("The target time is before the decodable segment; a nearby keyframe can't be used instead.");
  const selected = frames[index];
  const gaps = [
    index > 0 ? selected.pts - frames[index - 1].pts : 0,
    index + 1 < frames.length ? frames[index + 1].pts - selected.pts : 0,
  ].filter((g) => g > 0);
  const interval = gaps.length ? Math.min(...gaps) : nominal;
  // The selected frame starts at most one interval before the target when the window covers it.
  const tolerance = interval + Math.max(tick, 0.000001);
  if (
    !Number.isFinite(tolerance) ||
    target - selected.pts > tolerance ||
    (next < 0 && target - selected.pts > interval / 2)
  ) {
    throw new Error("The local video frames don't cover the target time. Capture stopped.");
  }
  return {
    requestedTitleSec: input.requestedTitleSec,
    sourceTargetPTS: target,
    selectedPTS: selected.pts,
    selectedTitleSec: input.requestedTitleSec + selected.pts - target,
    selectedPtsTicks: selected.ticks,
    timeBase,
    fps: Number.isFinite(fps) && fps > 0 ? fps : 1 / interval,
    toleranceSec: tolerance,
    errorSec: selected.pts - target,
    isKeyframe: selected.key,
    sourceStartSec: input.sourceTargetPTS === undefined ? start : undefined,
    policy: "displayed-pts",
  };
}

/** showinfo is after selection and before the image encoder; passthrough prevents sync duplication. */
export function verifyDecodedFrame(stderr: string, selection: FrameSelectionDiagnostic): number {
  const match = /\bn:\s*0\s+pts:\s*(-?\d+)\s+pts_time:\s*([-+\d.eE]+)/.exec(stderr);
  if (!match || Number(match[1]) !== selection.selectedPtsTicks) {
    throw new Error("The decoded frame time doesn't match the selected video frame. Capture stopped.");
  }
  return Number(match[1]) * rational(selection.timeBase);
}
