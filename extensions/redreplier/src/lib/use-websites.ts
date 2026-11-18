import { useCachedPromise } from "@raycast/utils";
import { api } from "./api";

export function useWebsites() {
  return useCachedPromise(
    async () => {
      const response = await api().listWebsites();
      return response.websites;
    },
    [],
    { failureToastOptions: { title: "Could Not Load Websites" } },
  );
}
