import { useCachedPromise } from "@raycast/utils";

import { alias } from "./api";

function useAlias(id: string) {
  return useCachedPromise(() => alias.get(id), [], {
    failureToastOptions: {
      message: "Please check your credentials in the extension preferences.",
      title: "Failed to load alias",
    },
    keepPreviousData: true,
  });
}

export default useAlias;
