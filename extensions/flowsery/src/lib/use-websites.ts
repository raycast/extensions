import { useCachedPromise } from "@raycast/utils";
import { api } from "./api";
import { websiteKey } from "./format";

export function useWebsites() {
  return useCachedPromise(
    async () => {
      const response = await api().listWebsites();
      return response.data.filter((website) => websiteKey(website));
    },
    [],
    { failureToastOptions: { title: "Could Not Load Websites" } },
  );
}
