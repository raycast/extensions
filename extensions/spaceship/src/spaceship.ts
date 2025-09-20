import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, SuccessResult } from "./types";

const { apiKey, apiSecret } = getPreferenceValues<Preferences>();
export const API_URL = "https://spaceship.dev/api/v1/";
export const API_HEADERS = {
  "X-Api-Key": apiKey,
  "X-Api-Secret": apiSecret,
  "Content-Type": "application/json",
};

export async function parseResponse(response: Response) {
  if (!response.ok) {
    const res = (await response.json()) as ErrorResult;
    throw new Error(res.data?.[0]?.details || res.detail);
  }
  if (!response.headers.get("Content-Length")) return {};
  const result = await response.json();
  return result;
}
export function useSpaceship<T>(endpoint: string) {
  const { isLoading, data, mutate, revalidate } = useFetch(`${API_URL}${endpoint}?take=20&skip=0`, {
    headers: API_HEADERS,
    parseResponse,
    mapResult(result) {
      const res = result as SuccessResult<T>;
      return {
        data: res.items,
      };
    },
    initialData: [],
  });
  return { isLoading, data, mutate, revalidate };
}
