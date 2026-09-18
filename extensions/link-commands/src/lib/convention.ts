import type { ScriptCommand } from "./types";

/**
 * Script Commands give you two strings — `title` and `packageName` — and no fields for scope,
 * brand or category. Encoding three axes into those two strings is therefore a naming convention
 * rather than a schema, and this module is the one place that knows it:
 *
 *     title        Sprint Board
 *     packageName  Linear · @work · #dev
 *
 *     title        Watch Later
 *     packageName  YouTube · #media
 *
 * The title is only ever the name. Raycast renders it bold and in full, so a sigil there is the first
 * thing read on every row it decorates and the thing least likely to differ between neighbours — thirty
 * work commands in a row all led with the same five characters. Both sigils live on the subtitle, which
 * Raycast searches just as it searches the title, so nothing typeable is lost by moving them.
 *
 * The environment used to lead the title (`@work · Sprint Board` / `Linear`), and commands written in
 * that form are still read correctly: the title-anchored sigil is honoured first, then the subtitle.
 * Only the writer changed. Nothing here rewrites a file on disk, so a collection migrates one command
 * at a time as its commands are recreated.
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

/**
 * A whole field inside `packageName` that is nothing but a sigil and a token. Anchored as a complete
 * field, so `Chat @ Mozilla` stays a brand — and so does `Brand · @ · #`, since a bare sigil has no token.
 * A brand that is itself a bare handle (`@kud`) is the one shape this cannot tell from a scope.
 */
const SIGIL_FIELD = /^([@#])([\p{L}\p{N}][\p{L}\p{N}_-]*)$/u;

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export type SplitPackage = {
  /** What is left once any sigil field has been lifted out. Undefined when nothing remains. */
  brand?: string;
  environment?: string;
  category?: string;
  /**
   * Sigil fields beyond the first of their kind, as typed. Each axis holds one value, so a second `@` has
   * nowhere to go — but it still has to leave the brand, or it reaches the filename. Returned rather than
   * discarded so the form can say so: a token removed from the field with no note is the silent loss this
   * whole split exists to prevent.
   */
  extras: string[];
};

/**
 * Splits a `packageName` into the axes it is carrying. One reader serves both sides: the list view
 * interprets a command on disk with it, and the create form runs what a person typed through it so that
 * `Linear · @work` — someone reaching for the Environment control through the wrong field — is taken as a
 * brand and a scope rather than as a brand named literally that, which would slug into a `linear-work.`
 * filename the convention has no name for.
 */
export const splitPackage = (packageName: string | undefined): SplitPackage => {
  const fields = (clean(packageName) ?? "")
    .split(SEPARATOR)
    .map((field) => field.trim())
    .filter(Boolean);

  const sigils = fields.map((field) => field.match(SIGIL_FIELD)).filter((match) => match !== null);
  const firstOf = (sigil: string) => sigils.find((match) => match[1] === sigil);
  const valueOf = (sigil: string) => firstOf(sigil)?.[2].toLowerCase();
  const extras = sigils.filter((match) => match !== firstOf(match[1])).map((match) => match[0]);

  const rawBrand = fields.filter((field) => !SIGIL_FIELD.test(field)).join(` ${SEPARATOR} `);
  const categoryMatch = rawBrand.match(CATEGORY_PATTERN);

  return {
    brand: clean(categoryMatch ? categoryMatch[1] : rawBrand),
    environment: valueOf("@"),
    category: valueOf("#") ?? categoryMatch?.[2].toLowerCase(),
    extras,
  };
};

export type Facets = {
  /** `work` from `Linear · @work`, or from the older `@work · Name`; absent for personal commands. */
  environment?: string;
  /** The title with any scope stripped — what the command actually is. */
  name: string;
  /** `packageName` with its sigil fields removed. Undefined when nothing remains. */
  brand?: string;
  /** `media` from `YouTube · #media`, absent when untagged. */
  category?: string;
};

/**
 * The title-anchored form is read first so that a command carrying both — a shape nothing writes, but
 * a hand edit can produce — keeps the scope its title has always shown in Raycast's own list.
 */
export const facetsOf = (command: Pick<ScriptCommand, "title" | "packageName">): Facets => {
  const environmentMatch = command.title.match(ENVIRONMENT_PATTERN);
  const name = clean(environmentMatch ? environmentMatch[2] : command.title) ?? command.title;
  const split = splitPackage(command.packageName);

  return {
    environment: environmentMatch ? environmentMatch[1].toLowerCase() : split.environment,
    name,
    brand: split.brand,
    category: split.category,
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
 * A package is written by hand and carries its own capitalisation — `YouTube`, `The Guardian`, `npm`,
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
