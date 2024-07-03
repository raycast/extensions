import { useCachedPromise } from "@raycast/utils";
import { getBrowsersTabs } from "../utils/applescript-utils";
import { BrowserTab } from "../types/types";

export function useData() {
  return useCachedPromise(() => {
    return getBrowsersTabs() as Promise<BrowserTab[]>;
  });
}
