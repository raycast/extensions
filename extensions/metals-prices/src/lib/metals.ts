/**
 * The metals this extension covers, the purity grades each is traded in, and
 * the pure math for turning a troy-ounce spot price into a per-gram price.
 *
 * Scope is the four precious metals metals.dev exposes on **both** endpoints:
 * `/latest` also returns industrial metals (copper, aluminum, lead, nickel,
 * zinc), but `/timeseries` returns only gold/silver/platinum/palladium — so an
 * industrial metal could show a spot price yet never a day's change or a period
 * average. Rather than ship half-working rows, we cover the four that the whole
 * feature set works for. The LBMA/MCX/IBJA keys in `/latest` are these same four
 * metals quoted by a different authority, so they are deliberately out of scope.
 */

/** Grams in one troy ounce (the unit precious-metal spot prices are quoted in). */
export const GRAMS_PER_TROY_OUNCE = 31.1034768;

/** metals.dev response keys for the metals we support, in display order. */
export const METAL_KEYS = ["gold", "silver", "platinum", "palladium"] as const;

export type MetalKey = (typeof METAL_KEYS)[number];

/**
 * A purity grade a metal is sold in. `fineness` is the fraction of pure metal,
 * which is exactly the factor between the pure per-gram price and this grade's.
 */
export interface Purity {
  /** Stable id, unique within its metal; used in the selector value. */
  id: string;
  /** Short label shown in the list, e.g. "22K" or "925". */
  label: string;
  /** What the grade is called in the trade, shown as the row subtitle. */
  note: string;
  /** Fraction of pure metal, 0-1. */
  fineness: number;
}

export interface Metal {
  key: MetalKey;
  /** Display name, e.g. "Gold". */
  label: string;
  /** Purity grades, purest first — the first entry is treated as the metal's pure form. */
  purities: Purity[];
}

/**
 * Gold is quoted in karats (fineness = karat/24, so 24K is treated as pure),
 * while the white metals are quoted in parts-per-thousand fineness. Each metal
 * keeps its own market's convention rather than being forced into a shared one.
 */
export const METALS: Metal[] = [
  {
    key: "gold",
    label: "Gold",
    purities: [
      { id: "24k", label: "24K", note: "Pure gold", fineness: 24 / 24 },
      { id: "22k", label: "22K", note: "22/24 purity", fineness: 22 / 24 },
      { id: "21k", label: "21K", note: "21/24 purity", fineness: 21 / 24 },
      { id: "18k", label: "18K", note: "18/24 purity", fineness: 18 / 24 },
    ],
  },
  {
    key: "silver",
    label: "Silver",
    purities: [
      { id: "999", label: "999", note: "Fine silver", fineness: 0.999 },
      { id: "958", label: "958", note: "Britannia silver", fineness: 0.958 },
      { id: "925", label: "925", note: "Sterling silver", fineness: 0.925 },
      { id: "900", label: "900", note: "Coin silver", fineness: 0.9 },
    ],
  },
  {
    key: "platinum",
    label: "Platinum",
    purities: [
      { id: "999", label: "999", note: "Fine platinum", fineness: 0.999 },
      { id: "950", label: "950", note: "Jewelry standard", fineness: 0.95 },
      { id: "900", label: "900", note: "900 platinum", fineness: 0.9 },
      { id: "850", label: "850", note: "850 platinum", fineness: 0.85 },
    ],
  },
  {
    key: "palladium",
    label: "Palladium",
    purities: [
      { id: "999", label: "999", note: "Fine palladium", fineness: 0.999 },
      { id: "950", label: "950", note: "Jewelry standard", fineness: 0.95 },
      { id: "500", label: "500", note: "500 palladium", fineness: 0.5 },
    ],
  },
];

/** A metal's definition, or `undefined` for an unknown key. */
export function findMetal(key: string): Metal | undefined {
  return METALS.find((metal) => metal.key === key);
}

/** The metal + purity the user currently has selected. */
export interface MetalSelection {
  metal: Metal;
  purity: Purity;
}

/** Fallback selection (and the default when nothing has been chosen yet). */
export const DEFAULT_SELECTION_ID = "gold:24k";

/** Serialise a selection into the dropdown value, e.g. "silver:925". */
export function selectionId(metal: Metal, purity: Purity): string {
  return `${metal.key}:${purity.id}`;
}

/**
 * Parse a `"metal:purity"` selector value. Falls back to gold 24K when the value
 * is missing or no longer valid (e.g. a persisted grade we later removed), so a
 * stale stored selection can never leave the UI without something to render.
 */
export function parseSelection(value: string | undefined): MetalSelection {
  const [metalKey, purityId] = (value ?? "").split(":");
  const metal = findMetal(metalKey) ?? METALS[0];
  const purity = metal.purities.find((p) => p.id === purityId) ?? metal.purities[0];
  return { metal, purity };
}

/** Convert a pure-metal price per troy ounce into a pure price per gram. */
export function pricePerGram(pricePerTroyOunce: number): number {
  return pricePerTroyOunce / GRAMS_PER_TROY_OUNCE;
}

/** Per-gram price of a purity grade, derived from the pure per-troy-ounce spot. */
export function pricePerGramForPurity(pricePerTroyOunce: number, purity: Purity): number {
  return pricePerGram(pricePerTroyOunce) * purity.fineness;
}
