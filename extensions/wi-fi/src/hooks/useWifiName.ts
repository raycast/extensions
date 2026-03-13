import { getCurWifiName } from "../utils/common-utils";
import { useCachedPromise } from "@raycast/utils";

export const useWifiName = () => {
  return useCachedPromise(() => {
    return getCurWifiName() as Promise<string>;
  });
};
