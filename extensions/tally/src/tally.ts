import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PaginatedResult } from "./interfaces";

const { api_token } = getPreferenceValues<Preferences>();
export const API_URL = "https://api.tally.so/";
export const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${api_token}`,
};
export const useTally = <T>(endpoint: string) =>
  useFetch<T>(API_URL + endpoint, {
    headers: API_HEADERS,
  });
export const useTallyPaginated = <T>(endpoint: string) =>
  useFetch(API_URL + endpoint, {
    headers: API_HEADERS,
    mapResult(result: PaginatedResult<T>) {
      return {
        data: result.items,
      };
    },
    initialData: [],
  });
