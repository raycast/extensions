/** Anything that carries the game's random state. */
export interface Seeded {
  rng: number;
}

/** A uniform number in [0, 1). Advances the seed, so the same save always rolls the same way. */
export function nextRandom(s: Seeded): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randomInt = (s: Seeded, min: number, max: number) =>
  min + Math.floor(nextRandom(s) * (max - min + 1));

export const pick = <T>(s: Seeded, list: T[]): T => list[Math.floor(nextRandom(s) * list.length)];
