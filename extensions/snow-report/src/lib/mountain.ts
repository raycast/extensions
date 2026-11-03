/**
 * Procedural mountain skylines. Each resort gets its own shape, seeded by its id, so it looks the
 * same every time. Heights are fractions: 0 is the valley floor (base), 1 the summit.
 */

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32). */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit number from a string. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Peak = { x: number; height: number; width: number; sharpness: number };

const shape = (x: number, p: Peak) => p.height * Math.max(0, 1 - Math.abs(x - p.x) / p.width) ** p.sharpness;

/**
 * Big peaks set the outline, small bumps ride on it (scaled by its height, so they sit on slopes,
 * not the valley floor), and smoothed noise adds rock. Normalized to [lo, hi].
 */
function skyline(
  rand: () => number,
  n: number,
  peaks: Peak[],
  bumps: Peak[],
  roughness: number,
  lo: number,
  hi: number,
): number[] {
  const noise = Array.from({ length: n }, () => rand() - 0.5);
  const raw = Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1);
    const outline = Math.max(0.02, ...peaks.map((p) => shape(x, p)));
    const h = outline * (1 + bumps.reduce((sum, b) => sum + shape(x, b), 0));
    const jitter = (noise[i] + (noise[i - 1] ?? 0) * 0.6 + (noise[i + 1] ?? 0) * 0.6) / 2.2;
    // A little roughness everywhere keeps the valley floor from looking ruler-flat.
    return h + jitter * roughness * (h + 0.12);
  });
  const [min, max] = [Math.min(...raw), Math.max(...raw)];
  return raw.map((h) => lo + ((h - min) / (max - min || 1)) * (hi - lo));
}

/**
 * A skyline that starts in a valley on the left and peaks right of center, so base sits left and
 * summit right, matching the Base and Summit columns. Two paler ridges go behind it.
 * The same seed always gives the same mountain.
 */
export function randomMountain(seed: string, n = 96): { profile: number[]; ridges: number[][] } {
  const rand = random(hash(seed));
  const between = (a: number, b: number) => a + rand() * (b - a);
  const count = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const peak = (x: [number, number], height: [number, number], width: [number, number], sharp: [number, number]) => ({
    x: between(...x),
    height: between(...height),
    width: between(...width),
    sharpness: between(...sharp),
  });

  const summit = peak([0.55, 0.9], [1, 1], [0.3, 0.6], [1.1, 2.2]);
  // Sometimes a twin summit just beside the main one.
  const twin =
    rand() < 0.3 ? [{ ...peak([0, 0], [0.82, 0.96], [0.12, 0.28], [1, 1.8]), x: summit.x + between(-0.16, 0.12) }] : [];
  const shoulders = Array.from({ length: count(1, 5) }, () => peak([0.2, 1], [0.25, 0.85], [0.06, 0.25], [0.9, 2]));
  const bumps = Array.from({ length: count(4, 12) }, () => peak([0.15, 1], [0.04, 0.14], [0.015, 0.05], [1, 1.6]));
  const profile = skyline(rand, n, [summit, ...twin, ...shoulders], bumps, between(0.04, 0.18), 0, 1);

  const ridges = [0, 1].map((i) => {
    const peaks = Array.from({ length: count(2, 4) }, () => peak([0, 1], [0.5, 1], [0.15, 0.45], [1, 1.8]));
    const small = Array.from({ length: count(0, 4) }, () => peak([0, 1], [0.03, 0.1], [0.03, 0.08], [1, 1.5]));
    const top = i === 0 ? between(0.75, 0.95) : between(0.6, 0.85);
    return skyline(rand, 32, peaks, small, 0.05, between(0.1, 0.3), top);
  });
  return { profile, ridges };
}
