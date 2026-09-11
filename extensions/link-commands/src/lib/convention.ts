import type { ScriptCommand } from "./types";

/**
 * Script Commands give you two strings — `title` and `packageName` — and no fields for scope,
 * brand or category. Encoding three axes into those two strings is therefore a naming convention
 * rather than a schema, and this module is the one place that knows it:
 *
 *     title        @work · Abacus Board
 *     packageName  Jira
 *
 *     title        Watch Later
 *     packageName  YouTube · #media
 *
 * Everything here degrades rather than fails. A command written by someone who has never heard of
 * the convention still parses — it simply has no environment and no category, and its brand is
 * whatever `packageName` happens to hold. That matters because this extension is published: most
 * of its users will have hostnames, bare labels or nothing at all in that field.
 */

const SEPARATOR = "·";

/** `@work · Name` — the sigil is anchored, so a mid-string `@` (as in `Chat @ Mozilla`) is not a scope. */
const ENVIRONMENT_PATTERN = new RegExp(`^@([\\p{L}\\p{N}][\\p{L}\\p{N}_-]*)\\s*${SEPARATOR}\\s*(.+)$`, "u");

/** `Brand · #category`, and the looser `Brand #category` that predates the separator. */
const CATEGORY_PATTERN = new RegExp(`^(.*?)\\s*(?:${SEPARATOR}\\s*)?#([\\p{L}\\p{N}][\\p{L}\\p{N}_-]*)\\s*$`, "u");

export type Facets = {
  /** `work` from `@work · Name`, absent for personal commands. */
  environment?: string;
  /** The title with the scope stripped — what the command actually is. */
  name: string;
  /** `packageName` with any category removed. Undefined when the field is empty. */
  brand?: string;
  /** `media` from `YouTube · #media`, absent when untagged. */
  category?: string;
};

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const facetsOf = (command: Pick<ScriptCommand, "title" | "packageName">): Facets => {
  const environmentMatch = command.title.match(ENVIRONMENT_PATTERN);
  const environment = environmentMatch ? environmentMatch[1].toLowerCase() : undefined;
  const name = clean(environmentMatch ? environmentMatch[2] : command.title) ?? command.title;

  const rawPackage = clean(command.packageName);
  const categoryMatch = rawPackage?.match(CATEGORY_PATTERN);

  return {
    environment,
    name,
    brand: clean(categoryMatch ? categoryMatch[1] : rawPackage),
    category: categoryMatch ? categoryMatch[2].toLowerCase() : undefined,
  };
};

const titleCase = (value: string) =>
  value.replace(/[-_]+/g, " ").replace(/\p{L}+/gu, (word) => word[0].toUpperCase() + word.slice(1));

/** Sigil forms, for section headers — they double as the string you would type to filter. */
export const environmentLabel = (environment: string) => `@${environment}`;
export const categoryLabel = (category: string) => `#${category}`;

/** Plain forms, for the dropdown and the detail pane — the row label supplies the axis, so the sigil is noise. */
export const environmentName = (environment: string) => titleCase(environment);
export const categoryName = (category: string) => titleCase(category);

/**
 * A package is written by hand and carries its own capitalisation — `YouTube`, `The Orchard`, `npm`,
 * `france.tv` — so it is shown verbatim. Title-casing it would produce `Npm`. Environments and
 * categories are parsed lowercase out of a sigil, which is why only those two get cased.
 */
export const packageLabel = (brand: string) => brand;

export type FacetCounts = {
  environments: { value: string; count: number }[];
  brands: { value: string; count: number }[];
  categories: { value: string; count: number }[];
};

const tally = (values: (string | undefined)[]) => {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value));
};

export const facetCounts = (commands: ScriptCommand[]): FacetCounts => {
  const facets = commands.map(facetsOf);

  return {
    environments: tally(facets.map((facet) => facet.environment)),
    brands: tally(facets.map((facet) => facet.brand)),
    categories: tally(facets.map((facet) => facet.category)),
  };
};
