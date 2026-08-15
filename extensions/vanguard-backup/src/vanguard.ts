import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, PaginatedResult, SuccessResult } from "./types";

const { vanguard_url, api_token } = getPreferenceValues<Preferences>();
export const buildApiUrl = (endpoint: string) => {
  try {
    return new URL(`api/${endpoint}`, vanguard_url).toString();
  } catch {
    return "";
  }
};
export const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${api_token}`,
};
export const parseResponse = async (response: Response) => {
  const result = await response.json();
  if (!response.ok) throw new Error((result as ErrorResult).message);
  return result;
};

export const callVanguard = async (
  endpoint: string,
  { method, body }: { method: string; body: Record<string, string | number | boolean> },
) => {
  const response = await fetch(buildApiUrl(endpoint), {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const result = await parseResponse(response);
  return result;
};
export const useVanguard = <T>(endpoint: string) =>
  useFetch<SuccessResult<T>, T, T | undefined>(buildApiUrl(endpoint), {
    headers,
    parseResponse,
    mapResult(result) {
      return {
        data: result.data,
      };
    },
  });
export const useVanguardPaginated = <T>(endpoint: string) =>
  useFetch<PaginatedResult<T>, T[], T[]>(({ cursor }) => cursor ?? buildApiUrl(endpoint), {
    headers,
    parseResponse,
    mapResult(result) {
      return {
        data: result.data,
        hasMore: !!result.next,
        cursor: result.next,
      };
    },
    initialData: [],
  });
