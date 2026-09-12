import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PenpotPreferences } from "./types";

const { accessToken } = getPreferenceValues<PenpotPreferences>();

const BASE_URL = "https://design.penpot.app/api/rpc/command";
const HEADERS = {
  Accept: "application/json",
  Authorization: `Token ${accessToken}`,
};

export function usePenpotFetch<T extends Record<string, any> | Record<string, any>[]>(
  path: string,
  options: RequestInit = {},
) {
  const opts = {
    ...options,
    headers: {
      ...HEADERS,
      ...options.headers,
    },
  };

  return useFetch<T>(`${BASE_URL}${path}`, opts);
}

export function formatDate(date: string) {
  return new Date(date).toLocaleString();
}
