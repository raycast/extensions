import { useCachedPromise } from "@raycast/utils";

import { recipients } from "./api";

function useRecipients() {
  return useCachedPromise(recipients.getAll, [], {
    failureToastOptions: {
      message: "Please check your credentials in the extension preferences.",
      title: "Failed to load recipients",
    },
    keepPreviousData: true,
  });
}

export default useRecipients;
