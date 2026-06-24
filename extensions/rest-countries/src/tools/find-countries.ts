import { searchCountries } from "../lib/rest-countries";
import type { CountryField } from "../lib/types";

type Input = {
  /**
   * Free-text query matched across ALL of a country's text properties. It can
   * match any of:
   * - common or official name — "Germany", "Kingdom of Spain"
   * - native name — "Deutschland", "Nippon-koku"
   * - alternate spelling — "Czechia", "Burma"
   * - translated name in any supported language — "Allemagne", "Niemcy"
   * - capital city — "Tokyo", "Canberra"
   * - region — "Europe", "Oceania"
   * - subregion — "Northern Europe", "Western Asia"
   * - continent — "South America"
   * - demonym (what citizens are called) — "Canadian", "Swiss"
   * - language — "Portuguese", "Arabic"
   * - currency code, name, or symbol — "EUR", "yen", "$"
   * - top-level domain — ".az", ".jp"
   * - calling code — "+44", "44"
   * - any code: ISO alpha-2 "DE", alpha-3 "JPN", numeric "840", IOC/FIFA "GER"
   *
   * This is a BROAD text search — it returns every country mentioning the term
   * anywhere, so a vague word can match many countries. Use the most
   * distinctive term from the user's request. Prefer `get-country` when they
   * clearly mean one specific country, and `list-countries` for structured
   * filters (region, language, currency, membership, landlocked).
   */
  query: string;
  /**
   * Page size: how many countries to return in this call. Defaults to 10,
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
   * is huge. Always include "names" so countries can be identified. Each value:
   * - names — common, official, native, alternate, and translated names
   * - codes — ISO alpha-2/alpha-3/numeric plus cioc, fifa, fips, gec
   * - capitals — capital cities with coordinates and role attributes
   * - flag — emoji, PNG/SVG URLs, description, colors
   * - region — Africa | Americas | Antarctic | Asia | Europe | Oceania
   * - subregion — e.g. "Northern Europe", "Caribbean"
   * - area — land area in km² and miles
   * - assets — image asset URLs
   * - borders — bordering countries as ISO alpha-3 codes
   * - calling_codes — dialing codes, e.g. ["+44"]
   * - cars — driving side and sign codes
   * - classification — sovereign, un_member, un_observer, disputed, dependency, iso_status
   * - continents — continents the country spans
   * - coordinates — geographic center lat/lng
   * - currencies — code, name, symbol
   * - date — start of week, academic and fiscal year starts
   * - demonyms — citizen names per language (feminine/masculine)
   * - economy — Gini coefficient(s) by year
   * - government_type — e.g. "Federal parliamentary republic"
   * - landlocked — boolean
   * - languages — name, native name, ISO 639 / BCP-47 codes
   * - leaders — heads of state/government with titles and links
   * - links — Google Maps, OpenStreetMap, Wikipedia, official site
   * - memberships — eu, nato, un, schengen, eurozone, g7, g20, … (booleans)
   * - number_format — decimal and thousands separators
   * - parent — parent country (for dependencies) as alpha-2/alpha-3
   * - population — total population count
   * - postal_code — format string and validation regex
   * - timezones — IANA time zones, e.g. ["UTC+01:00"]
   * - tlds — internet top-level domains, e.g. [".de"]
   * - uuid — stable unique record id
   */
  fields: CountryField[];
};

/**
 * Search the REST Countries database with a free-text query. Returns the
 * matching countries for ONE page plus a `meta` object describing it.
 *
 * `meta` fields: `total` (matches across all pages), `count` (returned in this
 * page), `limit`, `offset`, and `more` (true when further pages exist).
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
  const { success, countries, meta, error } = await searchCountries(
    input.query.trim(),
    input.fields,
    Math.min(input.limit ?? 10, 100),
    input.offset ?? 0,
  );
  if (!success) throw error;

  return { countries, meta };
}
