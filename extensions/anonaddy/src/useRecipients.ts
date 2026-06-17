import { useCachedPromise } from "@raycast/utils";

import { recipients } from "./api";

function useRecipients() {
  return useCachedPromise(() => recipients.getAll(), [], { keepPreviousData: true });
}

export default useRecipients;
