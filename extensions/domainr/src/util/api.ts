import { getPreferenceValues } from "@raycast/api";
import { ISearchResponse, IStatusResult, ErrorResult } from "./types";
import { DOMAIN_RESEARCH_API_URL } from "./constants";

const makeRequest = async <T>(endpoint: string) => {
  const { rapidApiKey } = getPreferenceValues<Preferences.Domainr>();
  const fastlyApiKey = rapidApiKey;
  const url = DOMAIN_RESEARCH_API_URL + endpoint;
  const response = await fetch(url, {
    headers: {
      "Fastly-Key": fastlyApiKey,
    },
  });
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Domain Research API not enabled. Please enable it in Fastly Dashboard.", {
        cause: response.status,
      });
    }

    const errorResult = result as ErrorResult;
    const errorMessage = errorResult.msg || errorResult.error || errorResult.message || "Unknown error occurred";

    throw new Error(errorMessage, {
      cause: response.status,
    });
  }
  return result as T;
};

export const getDomainStatus = (domain: string) => makeRequest<IStatusResult>(`status?domain=${domain}&scope=estimate`);

export const search = (query: string) => makeRequest<ISearchResponse>(`suggest?query=${query}`);
