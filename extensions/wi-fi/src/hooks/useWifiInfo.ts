import { getCurWifiInfo } from "../utils/common-utils";
import { useCachedPromise } from "@raycast/utils";
import { WifiInfo } from "../types/types";

export const useWifiInfo = () => {
  return useCachedPromise(() => {
    return getCurWifiInfo() as Promise<WifiInfo[]>;
  });
};
