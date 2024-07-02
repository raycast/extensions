import { Application, getDefaultApplication } from "@raycast/api";
import { TEST_URL } from "../utils/constants";
import { useCachedPromise } from "@raycast/utils";

export function useDefaultBrowsers() {
  return useCachedPromise(() => {
    return getDefaultApplication(TEST_URL) as Promise<Application>;
  });
}
