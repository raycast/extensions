import { useCachedPromise } from "@raycast/utils";

import { alias } from "./api";

function useAliases() {
  return useCachedPromise(alias.get, [], {
    failureToastOptions: {
      message: "Please check your credentials in the extension preferences.",
      title: "Failed to load aliases",
    },
    keepPreviousData: true,
  });
}

export default useAliases;
