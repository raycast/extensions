/**
 * Deterministic, dependency-free PRNG used by the mock layer.
 *
 * The same (seed, identifier) pair always produces the same numbers, so
 * `disk17` will reliably be e.g. "the slow one" across reloads. This makes
 * intermittent timeout bugs reproducible.
 */

/**
 * 32-bit FNV-1a string hash. Combined with the seed to bias each disk's
 * random stream.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 — small, fast, decent-quality PRNG. Returns a function that
 * yields floats in [0, 1) on each call.
 */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a deterministic RNG keyed off `seed` and `identifier`.
 * Calling this twice with the same arguments yields the same sequence.
 */
export function rngFor(seed: number, identifier: string): () => number {
  return makeRng((seed ^ fnv1a(identifier)) >>> 0);
}

/** Integer in [min, max] inclusive. */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Pick one element from `entries` using weights. Weights need not sum to 1. */
export function weightedPick<T>(rng: () => number, entries: { value: T; weight: number }[]): T {
  const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
  if (total <= 0) return entries[0].value;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}
