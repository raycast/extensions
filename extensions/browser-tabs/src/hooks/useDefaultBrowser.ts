import { useCachedPromise } from "@raycast/utils";
import { getDefaultApplication } from "@raycast/api";
import { TEST_URL } from "../utils/constants";

export function useDefaultBrowser() {
  return useCachedPromise(async () => {
    try {
      return await getDefaultApplication(TEST_URL);
    } catch {
      return undefined;
    }
  });
}
