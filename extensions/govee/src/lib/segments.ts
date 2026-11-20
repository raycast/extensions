import { colord } from "colord";

import { RateLimitError } from "@/lib/cloud";

/**
 * Govee's cloud allows 10 control requests per light per minute, and each distinct colour is one
 * request. Keep one spare so a toggle or snapshot right after still works.
 */
export const MAX_COLORS = 9;

/** `count` segments divided into equal runs, one per colour, in order (halves, thirds…). */
export const split = (count: number, colors: string[]): string[] =>
  Array.from({ length: count }, (_, i) => colors[Math.min(colors.length - 1, Math.floor((i * colors.length) / count))]);

/** Blend two colours by hue (shortest way round), so cyan → magenta passes through blue, not grey. */
const mixHue = (a: string, b: string, t: number) => {
  const x = colord(a).toHsl();
  const y = colord(b).toHsl();
  // Greys have no meaningful hue: borrow the other colour's so the blend doesn't swing through red.
  const hx = x.s < 5 ? y.h : x.h;
  const hy = y.s < 5 ? x.h : y.h;
  const dh = ((((hy - hx) % 360) + 540) % 360) - 180;
  return colord({ h: (hx + dh * t + 360) % 360, s: x.s + (y.s - x.s) * t, l: x.l + (y.l - x.l) * t })
    .toHex()
    .toUpperCase();
};

/**
 * `count` segments blending through `colors`, in at most MAX_COLORS bands (neighbouring segments
 * share a band when the strip has more segments than that).
 */
export const gradient = (count: number, colors: string[], maxBands = MAX_COLORS): string[] => {
  if (colors.length === 1 || count === 1) return Array(count).fill(colors[0].toUpperCase());
  const bands = Math.min(count, maxBands);
  const bandColor = (b: number) => {
    const t = (b / (bands - 1)) * (colors.length - 1);
    const k = Math.min(colors.length - 2, Math.floor(t));
    return mixHue(colors[k], colors[k + 1], t - k);
  };
  return Array.from({ length: count }, (_, i) => bandColor(Math.min(bands - 1, Math.floor((i * bands) / count))));
};

/** Group segments by colour so each distinct colour is one request, in strip order. */
export const groupBy = <T extends string | number>(
  values: Array<T | null>,
  segments: number[],
): Array<[T, number[]]> => {
  const groups = new Map<T, number[]>();
  values.forEach((v, i) => {
    if (v === null) return;
    groups.set(v, [...(groups.get(v) ?? []), segments[i]]);
  });
  return [...groups.entries()];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gap between commands: the strip drops commands that arrive in a burst, even though the cloud
// accepts them. Shortcut: fixed 250 ms; tune if a model still drops colours.
const GAP_MS = 250;

/**
 * Send colour groups one by one, in strip order (first segment first), so the strip fills left to
 * right and doesn't drop any. Requests Govee refuses for its per-minute limit are retried from that
 * point once it resets; `onWait` reports the countdown and `onProgress` how many have landed.
 * Returns an error message, or undefined when everything landed.
 */
export const sendSegments = async (
  device: { setSegmentsColor: (segments: number[], hex: string) => Promise<unknown> },
  groups: Array<[string, number[]]>,
  onWait: (left: number, total: number, seconds: number) => void,
  onProgress: (done: number, total: number) => void = () => undefined,
  gapMs = GAP_MS,
): Promise<string | undefined> => {
  const ordered = [...groups].sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]));
  let waits = 0;
  for (let i = 0; i < ordered.length; ) {
    const [hex, segs] = ordered[i];
    try {
      await device.setSegmentsColor(segs, hex);
      onProgress(++i, ordered.length);
      if (i < ordered.length) await sleep(gapMs);
    } catch (err) {
      if (!(err instanceof RateLimitError) || waits++ >= 2) return String((err as Error)?.message ?? err);
      const until = Date.now() + err.waitMs;
      while (Date.now() < until) {
        onWait(ordered.length - i, ordered.length, Math.ceil((until - Date.now()) / 1000));
        await sleep(Math.min(1000, until - Date.now()));
      }
    }
  }
  return undefined;
};
