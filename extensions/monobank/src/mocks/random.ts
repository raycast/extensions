/** A 32-bit hash of a string (FNV-1a), to seed `createRandom`. */
export function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Random {
  /** In [0, 1). */
  next: () => number;
  /** An integer in [min, max]. */
  int: (min: number, max: number) => number;
  /** A number in [min, max), rounded to `digits` decimals. */
  amount: (min: number, max: number, digits?: number) => number;
  /** Whether an event with probability `p` happens. */
  chance: (p: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  /** An item picked by its `weight` (1 when missing). */
  weighted: <T extends { weight?: number }>(items: readonly T[]) => T;
}

/** A seeded random generator (mulberry32): the same seed always gives the same sequence. */
export function createRandom(seed: string | number): Random {
  let state = typeof seed === "string" ? hash(seed) : seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));

  return {
    next,
    int,
    amount: (min, max, digits = 2) => Number((min + next() * (max - min)).toFixed(digits)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items) => {
      const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
      let point = next() * total;
      for (const item of items) {
        point -= item.weight ?? 1;
        if (point < 0) return item;
      }
      return items[items.length - 1];
    },
  };
}

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** A random-looking id like monobank's (e.g. "ZuHWzqkKGVo2"), the same for the same `seed`. */
export function createId(seed: string, length = 16) {
  // Two generators, so ids get 64 bits of seed and thousands of them don't collide.
  const first = createRandom(seed);
  const second = createRandom(`${seed}#`);
  return Array.from({ length }, (_, i) => ID_CHARS[Math.floor((i % 2 ? second : first).next() * ID_CHARS.length)]).join(
    "",
  );
}
