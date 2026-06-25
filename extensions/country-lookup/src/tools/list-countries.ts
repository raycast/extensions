import type { CountryFilters } from "@yusifaliyevpro/countries";
import { getFilteredCountries } from "../lib/rest-countries";
import type { CountryField } from "../lib/types";

type Membership =
  | "eu"
  | "nato"
  | "un"
  | "schengen"
  | "eurozone"
  | "commonwealth"
  | "g7"
  | "g20"
  | "brics"
  | "oecd"
  | "opec"
  | "asean";

type Input = {
  /**
   * Continent / region. Must be exactly one of: "Africa", "Americas",
   * "Antarctic", "Asia", "Europe", "Oceania". Note the Americas (North + South)
   * are a single region — there is no separate "North America" region here.
   */
  region?: "Africa" | "Americas" | "Antarctic" | "Asia" | "Europe" | "Oceania";
  /**
   * A more specific subregion within a region, e.g. "Northern Europe",
   * "Southern Europe", "Western Asia", "South-Eastern Asia", "Caribbean",
   * "South America", "Northern Africa". Use this instead of `region` when the
   * user is specific (e.g. "Scandinavian"/"Nordic" → "Northern Europe").
   */
  subregion?: string;
  /**
   * Only set this when the user EXPLICITLY mentions landlocked or coastal
   * countries. `true` returns only landlocked countries, `false` only coastal
   * ones. Otherwise leave it out entirely — do NOT default it to `false`, as
   * that wrongly drops landlocked countries (e.g. Austria, Hungary) from
   * results that should include them.
   */
  landlocked?: boolean;
  /**
   * Restrict to members of a single organisation. One of: "eu" (European
   * Union), "nato", "un" (United Nations), "schengen" (Schengen Area),
   * "eurozone", "commonwealth", "g7", "g20", "brics", "oecd", "opec",
   * "asean". For "countries using the euro" prefer "eurozone" over currency.
   */
  membership?: Membership;
  /**
   * Page size: how many countries to return in this call. Defaults to 25,
   * max 100 (the API hard limit).
   */
  limit?: number;
  /**
   * Number of matches to skip before this page. Defaults to 0. Set it to the
   * next page's start (previous `offset` + previous `limit`) ONLY when the user
   * explicitly asks for more results after seeing the first page.
   */
  offset?: number;
  /**
   * REQUIRED. The top-level fields to return for each country. Pick the
   * SMALLEST set that answers the user's question — a full page of all fields
   * is huge. Always include "names" so countries can be identified. Valid
   * values: names, codes, capitals, flag, region, subregion, area, assets,
   * borders, calling_codes, cars, classification, continents, coordinates,
   * currencies, date, demonyms, economy, government_type, landlocked,
   * languages, leaders, links, memberships, number_format, parent, population,
   * postal_code, timezones, tlds, uuid.
   */
  fields: CountryField[];
};

/**
 * List countries matching one or more property filters (region, subregion,
 * landlocked status, organisation membership).
 *
 * This tool CANNOT filter by language, currency, capital, or any free text. For
 * "X-speaking countries", "countries using the X currency", or any text lookup,
 * use `find-countries` instead. Never call this with no filter to fetch all
 * countries and then filter them yourself — that misses everything past the
 * first page.
 *
 * Every field is optional and independent — pass ONLY the filters the user
 * actually mentioned and leave the rest out entirely. Never add a filter the
 * user didn't ask for, and never set a field to a "default" value just to fill
 * it in.
 *   - "EU members" → `{ membership: "eu" }`  (NOT landlocked: false, NOT a region)
 *   - "countries in Asia" → `{ region: "Asia" }`
 * Combine filters only when the user genuinely asks for several at once, e.g.
 * "EU countries that are landlocked" → `{ membership: "eu", landlocked: true }`.
 * For lookups by language, currency, capital, or other free text, use
 * `find-countries` instead.
 *
 * Returns the matching countries for ONE page plus a `meta` object describing
 * it: `total` (matches across all pages), `count` (returned this page),
 * `limit`, `offset`, and `more` (true when further pages exist).
 *
 * Each call returns at most 100 countries (the API cap), and there are 250+
 * countries in total — so one call never holds them all. When the user wants
 * EVERY match (e.g. "all", "every", "the full list"), keep calling with
 * `offset` increased by the previous `limit` until `meta.more` is false
 * (roughly 3 calls for the whole world). Otherwise return the first page,
 * report `meta.total`, and let the user ask for more — don't paginate beyond
 * what's needed, since each call uses the user's API quota.
 */
export default async function tool(input: Input) {
  const filters: CountryFilters = {};
  if (input.region) filters.region = input.region;
  if (input.subregion) filters.subregion = input.subregion;
  if (input.landlocked !== undefined) filters.landlocked = input.landlocked;
  if (input.membership) filters.memberships = { [input.membership]: true };

  const limit = Math.min(input.limit ?? 25, 100);
  const offset = input.offset ?? 0;

  const result = await getFilteredCountries(filters, input.fields, limit, offset);

  if (!result.success) throw result.error;

  return { countries: result.countries, meta: result.meta };
}
