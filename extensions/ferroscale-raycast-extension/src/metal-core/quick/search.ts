import { PROFILE_DEFINITIONS } from "../datasets/profiles";
import type { ProfileCategory, ProfileId } from "../datasets/types";

/* ------------------------------------------------------------------ */
/*  Profile ID → canonical alias (mirrors STANDARD_ALIASES in parser) */
/* ------------------------------------------------------------------ */

const PROFILE_ID_TO_ALIAS: Partial<Record<ProfileId, string>> = {
  beam_ipe_en: "ipe",
  beam_ipn_en: "ipn",
  beam_hea_en: "hea",
  beam_heb_en: "heb",
  beam_hem_en: "hem",
  channel_upn_en: "upn",
  channel_upe_en: "upe",
  tee_en: "tee",
  shs_std_en: "shss",
  rhs_std_en: "rhss",
  angle_std_en: "la",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DimensionMatch {
  profileId: ProfileId;
  profileLabel: string;
  profileCategory: ProfileCategory;
  canonicalAlias: string;
  sizeId: string;
  sizeLabel: string;
  areaMm2: number;
  perimeterMm: number;
  referenceLabel: string;
  /** Linear density in kg/m at steel S235 density (7850 kg/m³) */
  linearDensityKgPerM: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Extract all numeric values from a size ID string.
 * Handles formats like: "40x3", "40x20x2", "ipe200", "upn80", "50x50x5", "20x2.5"
 */
function extractNumbers(sizeId: string): number[] {
  const matches = sizeId.match(/\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(Number);
}

/* ------------------------------------------------------------------ */
/*  Main search function                                               */
/* ------------------------------------------------------------------ */

/**
 * Search all standard profile sizes where ALL of the requested dimensions
 * appear in the size's numeric values.
 *
 * @param dims  One or more dimensions in mm (e.g. [200] or [200, 100])
 */
export function searchByDimension(dims: number[]): DimensionMatch[] {
  const results: DimensionMatch[] = [];

  for (const profile of PROFILE_DEFINITIONS) {
    if (profile.mode !== "standard") continue;
    const alias = PROFILE_ID_TO_ALIAS[profile.id];
    if (!alias) continue;

    for (const size of profile.sizes) {
      const nums = extractNumbers(size.id);
      if (!dims.every((d) => nums.some((n) => n === d))) continue;

      results.push({
        profileId: profile.id,
        profileLabel: profile.label,
        profileCategory: profile.category,
        canonicalAlias: alias,
        sizeId: size.id,
        sizeLabel: size.label,
        areaMm2: size.areaMm2,
        perimeterMm: size.perimeterMm ?? 0,
        referenceLabel: size.referenceLabel ?? profile.referenceLabel,
        linearDensityKgPerM: (size.areaMm2 * 7850) / 1e6,
      });
    }
  }

  return results;
}

/**
 * Parse the `?` dimension-search trigger from raw query text.
 * Returns an array of dimensions in mm, or null if not a dim-search query.
 *
 * Accepted forms:  "?40"  "?40x"  "?200x100"  "?200x100x5"  "? 40"
 */
export function parseDimSearchQuery(query: string): number[] | null {
  if (!query.startsWith("?")) return null;
  const nums = [...query.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map((m) => parseFloat(m[1]))
    .filter((n) => isFinite(n) && n > 0);
  return nums.length > 0 ? nums : null;
}
