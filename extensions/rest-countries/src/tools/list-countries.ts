import type { CountryFilters } from "@yusifaliyevpro/countries";
import { getCountriesByCurrency, getCountriesByLang, getFilteredCountries } from "../lib/rest-countries";
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
   * Official/spoken language by its English name, e.g. "Spanish", "Arabic",
   * "French", "Portuguese". For "Spanish-speaking countries" pass "Spanish".
   */
  language?: string;
  /**
   * Currency by ISO 4217 code or name, e.g. "EUR" or "Euro", "USD" or
   * "US dollar", "GBP" or "Pound sterling".
   */
  currency?: string;
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
 * List countries matching one or more filters (region, subregion, language,
 * currency, landlocked status, organisation membership).
 *
 * Every field is optional and independent — pass ONLY the filters the user
 * actually mentioned and leave the rest out entirely. Never add a filter the
 * user didn't ask for, and never set a field to a "default" value just to fill
 * it in.
 *   - "EU members" → `{ membership: "eu" }`  (NOT landlocked: false, NOT a region)
 *   - "Spanish-speaking countries" → `{ language: "Spanish" }`
 * Combine filters only when the user genuinely asks for several at once, e.g.
 * "EU countries that are landlocked" → `{ membership: "eu", landlocked: true }`.
 *
 * Returns the matching countries for ONE page plus a `meta` object describing
 * it: `total` (matches across all pages), `count` (returned this page),
 * `limit`, `offset`, and `more` (true when further pages exist).
 *
 * Make a single call and answer from that page. Do NOT loop to fetch every
 * page — each call uses the user's API quota. If `meta.more` is true, tell the
 * user the total and that they can ask for more; only then call again with a
 * higher `offset`.
 */
export default async function tool(input: Input) {
  const filters: CountryFilters = {};
  if (input.region) filters.region = input.region;
  if (input.subregion) filters.subregion = input.subregion;
  if (input.landlocked !== undefined) filters.landlocked = input.landlocked;
  if (input.membership) filters.memberships = { [input.membership]: true };

  const limit = Math.min(input.limit ?? 25, 100);
  const offset = input.offset ?? 0;

  // Make sure the fields needed for client-side narrowing below are fetched,
  // even if the AI requested a narrower set.
  const requested = new Set<CountryField>(input.fields);
  if (input.language && hasOtherFilters(input)) requested.add("languages");
  if (input.currency && hasOtherFilters(input)) requested.add("currencies");
  const fields = [...requested];

  const result =
    input.language && !hasOtherFilters(input)
      ? await getCountriesByLang(input.language, fields, limit, offset)
      : input.currency && !hasOtherFilters(input)
        ? await getCountriesByCurrency(input.currency, fields, limit, offset)
        : await getFilteredCountries(filters, fields, limit, offset);

  if (!result.success) throw result.error;

  let countries = result.countries;

  // The combined endpoint doesn't filter by language/currency, so narrow here.
  if (input.language && hasOtherFilters(input)) {
    const lang = input.language.toLowerCase();
    countries = countries.filter((c) => (c.languages ?? []).some((l) => l.name.toLowerCase().includes(lang)));
  }
  if (input.currency && hasOtherFilters(input)) {
    const cur = input.currency.toLowerCase();
    countries = countries.filter((c) =>
      (c.currencies ?? []).some((x) => x.code.toLowerCase() === cur || x.name.toLowerCase().includes(cur)),
    );
  }

  return { countries, meta: result.meta };
}

function hasOtherFilters(input: Input) {
  return Boolean(input.region || input.subregion || input.landlocked !== undefined || input.membership);
}
