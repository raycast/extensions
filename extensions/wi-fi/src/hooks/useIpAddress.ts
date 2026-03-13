import { getIPV4Address } from "../utils/common-utils";
import { useCachedPromise } from "@raycast/utils";

export const useIpAddress = () => {
  return useCachedPromise(() => {
    return getIPV4Address();
  });
};
