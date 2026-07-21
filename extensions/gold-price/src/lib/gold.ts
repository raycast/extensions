/**
 * Domain constants and pure helpers for converting a troy-ounce gold spot
 * price into per-gram prices for the karats commonly quoted in Gulf gold
 * markets.
 */

/** Grams in one troy ounce (the unit gold spot prices are quoted in). */
export const GRAMS_PER_TROY_OUNCE = 31.1034768;

/** Karats we surface, matching the common Gulf retail breakdown. */
export const KARATS = [24, 22, 21, 18] as const;

export type Karat = (typeof KARATS)[number];

/**
 * Purity factor for a karat relative to pure (24K) gold, e.g. 22K = 22/24.
 * A karat's per-gram price is the 24K per-gram price times this factor.
 */
export function karatPurity(karat: Karat): number {
  return karat / 24;
}

/** Convert a 24K price per troy ounce into a 24K price per gram. */
export function pricePerGram24k(pricePerTroyOunce: number): number {
  return pricePerTroyOunce / GRAMS_PER_TROY_OUNCE;
}

/** Per-gram price for a given karat, derived from the 24K per-troy-ounce spot. */
export function pricePerGramForKarat(pricePerTroyOunce: number, karat: Karat): number {
  return pricePerGram24k(pricePerTroyOunce) * karatPurity(karat);
}
