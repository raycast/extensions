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
          data: result.data
        }
      },
    });
    return { isLoading, data, error };
  }


  export const useImprovMXPaginated = <T, K extends string>(endpoint: string) => {
    const { isLoading, error, data, pagination } = useFetch(
      (options) =>
        API_URL + endpoint + "?" +
        new URLSearchParams({ page: String(options.page + 1) }).toString(), {
      headers: API_HEADERS,
      async parseResponse(response) {
        return await parseImprovMXResponse<{ [key in K]: T[] }>(response, { pagination: true });
      },
      mapResult(result) {
        const key = endpoint.split("/").at(-1);
        return {
          data: result.data[key as keyof typeof result.data] as T[],
          hasMore: result.hasMore
        }
      },
      initialData: []
    })
    return { isLoading, error, data, pagination };
  }