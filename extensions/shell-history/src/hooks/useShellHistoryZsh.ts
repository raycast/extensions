import { getShellHistoryZshFromFiles } from "../utils/shell-utils";
import { useCachedPromise } from "@raycast/utils";

export const useShellHistoryZsh = () => {
  return useCachedPromise(() => {
    return getShellHistoryZshFromFiles();
  }, []);
};
