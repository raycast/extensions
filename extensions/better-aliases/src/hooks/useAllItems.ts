import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getAllAliasesConfigAsync } from "../lib/getAllAliasesConfig";

export function useAllItems() {
  const result = useCachedPromise(async () => getAllAliasesConfigAsync(), [], {
    keepPreviousData: true,
    onError: (error) => {
      showFailureToast(error, { title: "Failed to load items" });
    },
  });

  return result;
}
