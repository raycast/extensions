import { getShellHistoryFishFromFiles } from "../utils/shell-utils";
import { useCachedPromise } from "@raycast/utils";

export const useShellHistoryFish = () => {
  return useCachedPromise(() => {
    return getShellHistoryFishFromFiles();
  }, []);
};
