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

// Fetch every country by paging through the API until `meta.more` is false.
// The v5 API caps each request at 100 results, so the ~254 countries take 3
// requests. The whole list is cached for 4 hours and searched locally, so the
// Search Countries command never hits the API per keystroke.
export const getAllCountries = withCache(
  async (): Promise<{ success: true; countries: Country[] } | { success: false; error: Error }> => {
    const countries: Country[] = [];
    let offset = 0;

    for (;;) {
      const result = await restCountries.getCountries({ limit: PAGE_SIZE, offset });
      if (!result.success) return { success: false, error: result.error };

      countries.push(...result.countries);
      if (!result.meta.more) break;
      offset += PAGE_SIZE;
    }

    return { success: true, countries };
  },
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
