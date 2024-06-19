import { Shell, ShellHistory } from "../types/types";
import { getShellHistoryFromFiles } from "../utils/shell-utils";
import { useCachedPromise } from "@raycast/utils";

export const useShellHistory = () => {
  return useCachedPromise(
    () => async () => {
      let _zshShellHistory: ShellHistory[] = [];
      let _bashShellHistory: ShellHistory[] = [];
      let _fishShellHistory: ShellHistory[] = [];
      try {
        _zshShellHistory = await getShellHistoryFromFiles(Shell.ZSH);
      } catch (e) {
        console.error(`${Shell.ZSH} ${String(e)}`);
      }
      try {
        _bashShellHistory = await getShellHistoryFromFiles(Shell.BASH);
      } catch (e) {
        console.error(`${Shell.BASH} ${String(e)}`);
      }
      try {
        _fishShellHistory = await getShellHistoryFromFiles(Shell.FISH);
      } catch (e) {
        console.error(`${Shell.BASH} ${String(e)}`);
      }
      const finalShellHistory = [_zshShellHistory, _bashShellHistory, _fishShellHistory];
      return { data: finalShellHistory };
    },
    [],
  );
};
