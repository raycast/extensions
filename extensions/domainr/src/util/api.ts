import { getPreferenceValues } from "@raycast/api";
import { ISearchResponse, IStatusResult } from "./types";
import { DOMAIN_RESEARCH_API_URL } from "./constants";

interface Preferences {
  rapidApiKey: string;
}

const makeRequest = async <T>(endpoint: string) => {
  const { rapidApiKey } = getPreferenceValues<Preferences>();
  const fastlyApiKey = rapidApiKey;
  if (!fastlyApiKey) {
    throw new Error("Fastly API Key is not configured. Please set it in the extension preferences.", {
      cause: 401,
    });
  }
  const url = DOMAIN_RESEARCH_API_URL + endpoint;
  console.log("Requesting:", url);
  const response = await fetch(url, {
    headers: {
      "Fastly-Key": fastlyApiKey,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    let errorMessage =
      (result as { msg?: string; error?: string; message?: string }).msg ||
      (result as { error?: string }).error ||
      (result as { message?: string }).message ||
      JSON.stringify(result);

    if (response.status === 404) {
      errorMessage = "Domain Research API not enabled. Please enable it in Fastly Dashboard.";
    }

    throw new Error(errorMessage, {
      cause: response.status,
    });
  }
  return result as T;
};

export const getDomainStatus = (domain: string) => makeRequest<IStatusResult>(`status?domain=${domain}&scope=estimate`);

export const search = (query: string) => makeRequest<ISearchResponse>(`suggest?query=${query}`);
