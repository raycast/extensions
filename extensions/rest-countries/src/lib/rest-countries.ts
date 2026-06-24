import { getPreferenceValues } from "@raycast/api";
import { withCache } from "@raycast/utils";
import { RestCountries, type Country, type CountryFilters } from "@yusifaliyevpro/countries";

const { apiKey } = getPreferenceValues<Preferences>();
const restCountries = new RestCountries({ apiKey: apiKey.trim() });

// The REST Countries v5 API caps a single request at 100 results.
export const PAGE_SIZE = 100;

// Cache every query for 4 hours, but only if the result is successful. This prevents caching of 404s and other errors.
const cacheOptions = {
  maxAge: 4 * 60 * 60 * 1000,
  validate: (result: { success: boolean }) => result.success,
};

// --- List / detail view ---------------------------------------------------

export const getCountriesPage = withCache(
  (query: string, offset: number) =>
    query
      ? restCountries.search(query, { limit: PAGE_SIZE, offset })
      : restCountries.getCountries({ limit: PAGE_SIZE, offset }),
  cacheOptions,
);

// --- AI tools -------------------------------------------------------------
// Every AI tool requires `fields`: the model picks the minimal set it needs so
// each result stays small (a 100-country page of full objects is huge).

type Fields = readonly (keyof Country)[];

export const getCountryByAlpha2 = withCache(
  (code: string, fields: Fields) => restCountries.getCountryByCode({ alpha_2: code, fields }),
  cacheOptions,
);

export const getCountryByAlpha3 = withCache(
  (code: string, fields: Fields) => restCountries.getCountryByCode({ alpha_3: code, fields }),
  cacheOptions,
);

export const getCountryByName = withCache(
  (name: string, fields: Fields) => restCountries.getCountriesByName({ name, fields, limit: 1 }),
  cacheOptions,
);

export const searchCountries = withCache(
  (query: string, fields: Fields, limit: number, offset: number) =>
    restCountries.search(query, { fields, limit, offset }),
  cacheOptions,
);

export const getFilteredCountries = withCache(
  (filters: CountryFilters, fields: Fields, limit: number, offset: number) =>
    restCountries.getCountries({ filters, fields, limit, offset }),
  cacheOptions,
);
