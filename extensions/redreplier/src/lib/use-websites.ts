import { useCachedPromise } from "@raycast/utils";
import { api } from "./api";
import { showApiError } from "./feedback";

export function useWebsites() {
  return useCachedPromise(
    async () => {
      const response = await api().listWebsites();
      return response.websites;
    },
    [],
    { onError: (error) => showApiError("Could Not Load Websites", error) },
  );
}
