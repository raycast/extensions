import { getCurWifiStatus } from "../utils/common-utils";
import { useCachedPromise } from "@raycast/utils";

export const useWifiStatus = () => {
  return useCachedPromise(() => {
    return getCurWifiStatus() as Promise<boolean>;
  });
};
