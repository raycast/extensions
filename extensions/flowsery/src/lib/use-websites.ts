import { useCachedPromise } from "@raycast/utils";
import { api } from "./api";
import { showApiError } from "./feedback";
import { websiteKey } from "./format";

export function useWebsites() {
  return useCachedPromise(
    async () => {
      const response = await api().listWebsites();
      return response.data.filter((website) => websiteKey(website));
    },
    [],
    { onError: (error) => showApiError("Could Not Load Websites", error) },
  );
}
