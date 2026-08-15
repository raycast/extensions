import { useCachedPromise } from "@raycast/utils";
import { listTabs } from "../lib/browser";

export function useTabs() {
  return useCachedPromise(listTabs, [], { keepPreviousData: true });
}
