import { useCachedPromise } from "@raycast/utils";
import { getBrowsersTabs } from "../utils/applescript-utils";
import { BrowserTab } from "../types/types";

export function useBrowserTabs() {
  return useCachedPromise(() => {
    return getBrowsersTabs() as Promise<BrowserTab[]>;
  });
}
