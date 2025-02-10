import { useCachedPromise } from "@raycast/utils";
import { Application, getDefaultApplication } from "@raycast/api";
import { TEST_URL } from "../utils/constants";

export function useDefaultBrowser() {
  return useCachedPromise(() => {
    return getDefaultApplication(TEST_URL) as Promise<Application>;
  });
}
