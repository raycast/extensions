import { useFetch } from "@raycast/utils";
import { GrowthbookResponse } from "../types";
import { getPreferenceValues } from "@raycast/api";

const endpoint = "https://api.growthbook.io/api/v1/features?limit=100";

export function useGrowthbook(): ReturnType<typeof useFetch<GrowthbookResponse, unknown>> {
  const { personalAccessToken } = getPreferenceValues<{ personalAccessToken: string }>();

  return useFetch(endpoint, {
    headers: {
      Authorization: `Bearer ${personalAccessToken}`,
    },
    parseResponse: async (response: Response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch Growthbook data.");
      }
      return response.json();
    },
  });
}
