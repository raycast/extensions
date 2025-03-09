import { useCachedPromise } from "@raycast/utils";

import { domains } from "./api";

function useOptions() {
  return useCachedPromise(domains.options, [], {
    failureToastOptions: {
      message: "Please check your credentials in the extension preferences.",
      title: "Failed to load options",
    },
    keepPreviousData: true,
  });
}

export default useOptions;
