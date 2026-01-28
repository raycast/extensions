import { useCachedPromise } from "@raycast/utils";
import { getBrowserSetup } from "../utils/applescript-utils";
import { BrowserSetup } from "../types/types";

export function useBrowserSetup() {
  return useCachedPromise(() => {
    return getBrowserSetup() as Promise<BrowserSetup[]>;
  });
}
