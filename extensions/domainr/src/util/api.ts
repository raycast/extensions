import { getPreferenceValues } from "@raycast/api";
import { ISearchResponse, IStatusResult } from "./types";

const { rapidApiKey } = getPreferenceValues<Preferences.Domainr>();
const API_URL = "https://api.fastly.com/domain-management/v1/tools/";
const API_HEADERS = {
  "Fastly-Key": rapidApiKey,
};
const makeRequest = async <T>(endpoint: string) => {
  const response = await fetch(API_URL + endpoint, {
    headers: API_HEADERS,
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error((result as { msg: string }).msg, {
      cause: response.status,
    });
  }
  return result as T;
};

export const getDomainStatus = (domain: string) => makeRequest<IStatusResult>(`status?domain=${domain}&scope=estimate`);

export const search = (query: string) => makeRequest<ISearchResponse>(`suggest?query=${query}`);
