import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { debugConfig } from "../utils/debugConfig";

interface Preferences {
  domain: string;
  token: string;
}

export function useAPIFetch<T>(endpoint: string) {
  const preferences = getPreferenceValues<Preferences>();

  return useFetch<T>(`https://${preferences.domain}/api/v1/${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
    parseResponse: async (response) => {
      if (!response.ok) {
        if (response.statusText === "Unauthorized") {
          throw new Error("Unauthorized, check your token in extension settings.");
        }
        throw new Error(response.statusText);
      }

      const json = await response.json();

      if (debugConfig.printFetches) {
        console.log("API Response:", json);
      }

      return json;
    },
  });
}
