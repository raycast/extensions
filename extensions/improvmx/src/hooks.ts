import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./constants";
import { parseImprovMXResponse } from "./utils";

export const useImprovMX = <T>(endpoint: string) => {
  const { isLoading, data, error } = useFetch(API_URL + endpoint, {
    headers: API_HEADERS,
    async parseResponse(response) {
      return await parseImprovMXResponse<T>(response, { pagination: false });
    },
    mapResult(result) {
      return {
        data: result.data,
      };
    },
  });
  return { isLoading, data, error };
};

/**
 * Custom hook to fetch paginated data from the ImprovMX API.
 *
 * @template T The type of the data item w/o Array.
 * @template K The key in the result data object that contains the data array.
 *
 * @param {string} endpoint The API endpoint to fetch data from.
 *
 * @returns {{
 *   isLoading: boolean;
 *   error: Error | null;
 *   data: T[];
 *   pagination: { hasMore: boolean };
 * }} An object containing the loading state, error (if any), fetched data, and pagination info.
 */
export const useImprovMXPaginated = <T, K extends string>(endpoint: string) => {
  const { isLoading, error, data, pagination } = useFetch(
    (options) => API_URL + endpoint + "?" + new URLSearchParams({ page: String(options.page + 1) }).toString(),
    {
      headers: API_HEADERS,
      async parseResponse(response) {
        return await parseImprovMXResponse<{ [key in K]: T[] }>(response, { pagination: true });
      },
      mapResult(result) {
        const key = endpoint.split("/").at(-1);
        return {
          data: result.data[key as keyof typeof result.data] as T[],
          hasMore: result.hasMore,
        };
      },
      initialData: [],
    },
  );
  return { isLoading, error, data, pagination };
};
