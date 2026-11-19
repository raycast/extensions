import { useCachedPromise } from "@raycast/utils";
import { listJournals } from "./api";
import { isDemo } from "./demo";
import { onErrorToast } from "./feedback";

/** The journal list, cached separately in demo mode so screenshots never paint real journals. */
export function useJournals() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `demo` only keys the cache
  return useCachedPromise((demo: boolean) => listJournals(), [isDemo()], {
    onError: onErrorToast("Couldn't Load Journals"),
  });
}
