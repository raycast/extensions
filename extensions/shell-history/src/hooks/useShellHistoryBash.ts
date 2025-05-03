import { getShellHistoryBashFromFiles } from "../utils/shell-utils";
import { useCachedPromise } from "@raycast/utils";

export const useShellHistoryBash = () => {
  return useCachedPromise(() => {
    return getShellHistoryBashFromFiles();
  }, []);
};
