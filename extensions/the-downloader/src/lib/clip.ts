import { formatClock } from "./format.js";

// Downloading part of a video: the Clip field of the Download form, read into
// seconds and handed to yt-dlp's --download-sections.

/** A stretch of a video, in seconds from its start. A missing side means the video's own start or end. */
export type Clip = { start?: number; end?: number };

const TIME_HINT = "Use times like 1:30-2:45, 90-120 or 1:30- (to the end).";

/**
 * Seconds from `90`, `1:30`, `1:02:03`, `1m30s` or `1h2m`. `undefined` for an
 * empty text, `NaN` for one that isn't a time.
 */
export function parseTimestamp(text: string): number | undefined {
  const t = text.trim().toLowerCase();
  if (!t) return undefined;
  const units = /^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s)?$/.exec(t);
  if (units && (units[1] || units[2] || units[3])) {
    return Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0);
  }
  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d+)?$/.test(t)) return NaN;
  const parts = t.split(":").map(Number);
  // Minutes and seconds after a colon stay under 60: `1:75` is a typo, not 2:15.
  if (parts.slice(1).some((part) => part >= 60)) return NaN;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/**
 * Read the Clip field: `start-end`, with either side optional (`1:30-`,
 * `-0:45`); a lone time is the start. An empty field, or one that covers the
 * whole video, gives no clip. `duration` (seconds), when known, catches a start
 * past the end.
 */
export function parseClip(text: string, duration?: number): { clip?: Clip; error?: string } {
  const t = text.trim();
  if (!t) return {};
  // A hyphen, an en or em dash, or "to" between the two times.
  const sides = t.split(/\s*(?:[-–—]|to)\s*/i);
  if (sides.length > 2) return { error: TIME_HINT };
  const start = parseTimestamp(sides[0]);
  const end = sides.length === 2 ? parseTimestamp(sides[1]) : undefined;
  if (Number.isNaN(start) || Number.isNaN(end)) return { error: TIME_HINT };
  if (start !== undefined && end !== undefined && end <= start) {
    return { error: "The end must be after the start." };
  }
  if (duration && start !== undefined && start >= duration) {
    return { error: `The video is only ${formatClock(duration)} long.` };
  }
  const wholeStart = !start;
  const wholeEnd = end === undefined || (!!duration && end >= duration);
  if (wholeStart && wholeEnd) return {};
  return { clip: { start: wholeStart ? undefined : start, end: wholeEnd ? undefined : end } };
}

/** yt-dlp's `--download-sections` value for a clip: `*90-165`, `*90-inf`. */
export function sectionArg(clip: Clip): string {
  return `*${clip.start ?? 0}-${clip.end ?? "inf"}`;
}

/** The clip as people read it: `1:30–2:45`, `from 1:30`, `to 2:45`. */
export function clipLabel(clip: Clip): string {
  if (clip.start !== undefined && clip.end !== undefined) return `${formatClock(clip.start)}–${formatClock(clip.end)}`;
  return clip.start !== undefined ? `from ${formatClock(clip.start)}` : `to ${formatClock(clip.end)}`;
}

/**
 * What a clip adds to its file name, so it doesn't replace the whole video
 * saved in the same folder: ` [1.30-2.45]`. Dots, since a colon can't be in a
 * file name.
 */
export function clipSuffix(clip: Clip): string {
  const stamp = (seconds: number | undefined, missing: string) =>
    seconds === undefined ? missing : formatClock(seconds).replace(/:/g, ".");
  return ` [${stamp(clip.start, "0.00")}-${stamp(clip.end, "end")}]`;
}
