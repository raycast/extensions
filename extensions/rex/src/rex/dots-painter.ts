/**
 * Rex's "working" indicator: three dots whose opacity pulses in a travelling wave.
 *
 * Recovered from TabStatusIndicatorView in the Rex binary (see docs/rex-working-animation.md):
 * a 14 pt view with three 3.5 pt dots on 5.5 pt centres; each dot runs a CAKeyframeAnimation on
 * opacity with values 0.3 → 0.85 → 0.3 → 0.3 at key times 0, 0.25, 0.5, 1 over 1.2 s, ease-in-ease-out,
 * repeating forever, with dot i starting 0.2 s after dot i-1.
 *
 * Pure pixel code with no Raycast dependency so it can be exercised outside the extension.
 */

export const DOT_COUNT = 3;
/** Points, from Rex's layout. */
export const VIEW_SIZE_PT = 14;
export const DOT_DIAMETER_PT = 3.5;
export const DOT_SPACING_PT = 5.5;
/** Seconds, from Rex's animation. */
export const PERIOD_S = 1.2;
export const STAGGER_S = 0.2;
export const KEY_TIMES = [0, 0.25, 0.5, 1];
export const OPACITIES = [0.3, 0.85, 0.3, 0.3];

export interface DotsPaintOptions {
  /** Output canvas size in pixels (square). */
  size: number;
  appearance: "light" | "dark";
  /** How many frames one period is divided into. */
  frames: number;
}

type RGB = [number, number, number];

/** Rex draws the dots in the tab's foreground text colour; the light variant is a grey that reads on white. */
const DOT_COLOR: Record<"light" | "dark", RGB> = { dark: [229, 233, 239], light: [58, 62, 68] };

/** Core Animation's kCAMediaTimingFunctionEaseInEaseOut, cubic-bezier(0.42, 0, 0.58, 1), approximated by smoothstep. */
function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Opacity of dot `index` at `time` seconds into the cycle. */
export function dotOpacity(index: number, time: number): number {
  const local = (((time - index * STAGGER_S) % PERIOD_S) + PERIOD_S) % PERIOD_S;
  const t = local / PERIOD_S;
  for (let i = 1; i < KEY_TIMES.length; i++) {
    if (t <= KEY_TIMES[i]) {
      const span = KEY_TIMES[i] - KEY_TIMES[i - 1];
      const f = span <= 0 ? 0 : easeInOut((t - KEY_TIMES[i - 1]) / span);
      return OPACITIES[i - 1] + (OPACITIES[i] - OPACITIES[i - 1]) * f;
    }
  }
  return OPACITIES[OPACITIES.length - 1];
}

/** Paint one frame of the three dots, horizontally centred in a square canvas. */
export function paintDots(
  frame: number,
  options: DotsPaintOptions,
): { width: number; height: number; data: Uint8Array } {
  const { size, appearance, frames } = options;
  // Sample mid-frame so the 0.85 peaks (at 0.3, 0.5, 0.7 s) land on frames when a cycle has 6 of them.
  const time = ((((frame % frames) + frames) % frames) + 0.5) * (PERIOD_S / frames);
  const scale = size / VIEW_SIZE_PT;
  const radius = (DOT_DIAMETER_PT / 2) * scale;
  const spacing = DOT_SPACING_PT * scale;
  const [r, g, b] = DOT_COLOR[appearance];
  const centers = Array.from({ length: DOT_COUNT }, (_, i) => ({
    x: size / 2 + (i - (DOT_COUNT - 1) / 2) * spacing,
    y: size / 2,
    opacity: dotOpacity(i, time),
  }));
  const data = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let alpha = 0;
      for (const dot of centers) {
        const d = Math.hypot(px + 0.5 - dot.x, py + 0.5 - dot.y) - radius;
        const coverage = Math.min(1, Math.max(0, 0.5 - d)); // 1 px anti-aliased edge
        if (coverage > 0) alpha = Math.max(alpha, coverage * dot.opacity);
      }
      if (alpha <= 0) continue;
      const idx = (py * size + px) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  return { width: size, height: size, data };
}
