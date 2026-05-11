import { useFetch } from "@raycast/utils";
import { Root } from "./interfaces";

const API_URL = "https://api.fda.gov/drug/drugsfda.json";
const PAGE_SIZE = 25; // You can adjust this

/**
 * Custom hook for searching the openFDA drug database with pagination.
 *
 * @param search - The search query.
 * @param sort - The field to sort by (e.g., "sponsor_name:asc"). Must be a non-analyzed field.
 *              Use non-analyzed fields like: sponsor_name, application_number
 *              Do NOT use analyzed fields like: openfda.brand_name
 */
export function useDrugSearch(search: string, sort?: string) {
  const { isLoading, data, error, pagination } = useFetch(
    (options) => {
      // This function is called by useFetch to get the URL for each page
      const params = new URLSearchParams();

      // Handle search
      if (search) {
        params.append("search", search);
      }

      // Handle sorting
      if (sort) {
        params.append("sort", sort);
      }

      // Handle pagination
      // The API uses `skip` and `limit`
      const skip = options.page * PAGE_SIZE;
      params.append("limit", String(PAGE_SIZE));
      params.append("skip", String(skip));

      const url = `${API_URL}?${params.toString()}`;
      return url;
    },
    {
      // Always fetch - either search results or all drugs by default
      // mapResult is used to transform the API response into the format useFetch expects
      // for pagination: { data: [], hasMore: boolean }
      mapResult(result: Root) {
        try {
          const total = result.meta.results.total;
          const skip = result.meta.results.skip;
          const limit = result.meta.results.limit;

          const hasMore = skip + limit < total;

          return {
            data: result.results, // The array of drug results
            hasMore: hasMore, // Boolean to indicate if more pages are available
          };
        } catch {
          return {
            data: [],
            hasMore: false,
          };
        }
      },
      onError() {
        // Handle errors silently
      },
      // Keep previous data while loading new search results to prevent flickering
      keepPreviousData: true,
      initialData: [], // Start with an empty array of results
    },
  );

  return {
    isLoading,
    data,
    error,
    pagination,
  };
}
