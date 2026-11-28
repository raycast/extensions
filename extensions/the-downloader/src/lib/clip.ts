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

/** The clip as the Clip field takes it: `1:30-2:45`, `1:30-`. */
export function clipText(clip: Clip): string {
  const side = (seconds: number | undefined) => (seconds === undefined ? "" : formatClock(seconds));
  return `${side(clip.start)}-${side(clip.end)}`;
}

/** How long a moment is when the answer names only where it starts. */
export const MOMENT_SECONDS = 60;
/** A following timestamp ends the moment only when it is this close; further away it's another topic. */
const MOMENT_MAX_SECONDS = 300;
/** Moments offered for one answer. */
export const MAX_MOMENTS = 12;

const STAMP = String.raw`\d{1,2}(?::\d{2}){1,2}`;
const MOMENT_RE = new RegExp(String.raw`\[(${STAMP})(?:\s*[–—-]\s*(${STAMP}))?\]`, "g");

/**
 * The moments an AI answer points at (`[1:30]`, `[4:25–6:02]`), as clips to
 * download, in the video's order. A range is taken as written. A single
 * timestamp runs to the answer's next one when that is within five minutes,
 * else for a minute. `duration` (seconds), when known, drops timestamps past
 * the end and stops a clip at it.
 */
export function answerMoments(answer: string, duration?: number): Required<Clip>[] {
  const found: { start: number; end?: number }[] = [];
  for (const match of answer.matchAll(MOMENT_RE)) {
    const start = parseTimestamp(match[1]);
    const end = match[2] ? parseTimestamp(match[2]) : undefined;
    if (start === undefined || Number.isNaN(start)) continue;
    if (duration && start >= duration) continue;
    const known = found.find((moment) => moment.start === start);
    const range = end !== undefined && !Number.isNaN(end) && end > start ? end : undefined;
    // The same moment named twice: a written range beats a guessed end.
    if (known) known.end ??= range;
    else found.push({ start, end: range });
  }
  found.sort((a, b) => a.start - b.start);
  return found.slice(0, MAX_MOMENTS).map((moment, i) => {
    const next = found[i + 1]?.start;
    const guessed =
      next !== undefined && next - moment.start <= MOMENT_MAX_SECONDS ? next : moment.start + MOMENT_SECONDS;
    const end = moment.end ?? guessed;
    return { start: moment.start, end: duration ? Math.min(end, duration) : end };
  });
}
