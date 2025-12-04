import { Application, getApplications } from "@raycast/api";
import { TEST_URL } from "../utils/constants";
import { useCachedPromise } from "@raycast/utils";

export function useBrowsers() {
  return useCachedPromise(() => {
    return getApplications(TEST_URL) as Promise<Application[]>;
  });
}
