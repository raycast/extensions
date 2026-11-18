import sectionsData from "./sections.json";

export interface Section {
  /** Público API slug, used as `/api/list/{slug}`. */
  slug: string;
  /** Human-readable Portuguese display name. */
  title: string;
  /** Extra search keywords for Raycast root command matching. */
  keywords?: string[];
}

/**
 * The curated set of Público section feeds exposed as commands.
 *
 * Source of truth for both runtime (section command components) and the
 * `scripts/generate-sections.mjs` generator. To add a section, drop its slug
 * here (verify it first with `npm run discover`) and re-run
 * `npm run generate:sections`.
 */
export const SECTIONS: Section[] = sectionsData;
