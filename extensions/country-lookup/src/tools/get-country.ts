import { getCountryByAlpha2, getCountryByAlpha3, searchCountries } from "../lib/rest-countries";
import type { CountryField } from "../lib/types";

type Input = {
  /**
   * The country to look up. Anything but a 2- or 3-letter code runs a free-text
   * search across ALL country properties, so almost any identifier resolves to
   * the right country. Examples:
   * - a common or official name — "Germany", "Federal Republic of Germany"
   * - a native or translated name — "Deutschland"
   * - an ISO 3166-1 alpha-2 code — "DE" (2 letters)
   * - an ISO 3166-1 alpha-3 code — "DEU" (3 letters)
   * - a capital city — "Berlin"
   * - a language — "German"
   * - a currency — "Euro" or "EUR"
   * - a demonym — "German"
   * - a top-level domain — ".de"
   * - a calling code — "+49"
   * - a region or subregion — "Western Europe"
   *
   * Two-letter input is treated as an alpha-2 code and three-letter input as an
   * alpha-3 code, so pass a full name (not a code) when the user means a name.
   * Prefer the most specific identifier the user provided. When the query could
   * match many countries (e.g. a language or region), this returns only the
   * single best match — use find-countries or list-countries for full lists.
   */
  country: string;
  /**
   * REQUIRED. The top-level fields to return. Pick only what the user needs
   * (e.g. ["capitals"] for the capital); request more fields only for a broad
   * "tell me about X" question. Valid values: names, codes, capitals, flag,
   * region, subregion, area, assets, borders, calling_codes, cars,
   * classification, continents, coordinates, currencies, date, demonyms,
   * economy, government_type, landlocked, languages, leaders, links,
   * memberships, number_format, parent, population, postal_code, timezones,
   * tlds, uuid.
   */
  fields: CountryField[];
};

const ALPHA_2 = /^[a-z]{2}$/i;
const ALPHA_3 = /^[a-z]{3}$/i;

/**
 * Get data about a single country, returning only the requested `fields`
 * (capital, region, population, languages, currencies, timezones, memberships,
 * links, …). Use this when the user wants details about one specific country.
 */
export default async function tool(input: Input) {
  const query = input.country.trim();
  const fields = input.fields;

  const result = ALPHA_2.test(query)
    ? await getCountryByAlpha2(query.toUpperCase(), fields)
    : ALPHA_3.test(query)
      ? await getCountryByAlpha3(query.toUpperCase(), fields)
      : await firstBySearch(query, fields);

  if (!result.success) throw result.error;

  return result.country;
}

// Free-text search matches names, capitals, languages, currencies and more, so
// a plain query like "Germany" or "Berlin" resolves to the right country.
async function firstBySearch(query: string, fields: CountryField[]) {
  const result = await searchCountries(query, fields, 1, 0);
  if (!result.success) return result;
  const country = result.countries[0];
  if (!country)
    return {
      success: false as const,
      country: undefined,
      error: new Error(`No country found for "${query}".`),
    };
  return { success: true as const, country, error: undefined };
}
