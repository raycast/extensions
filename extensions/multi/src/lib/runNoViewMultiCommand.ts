import { PopToRootType, closeMainWindow } from "@raycast/api";
import { showMultiScriptErrorToastAndLogError } from "./showMultiScriptErrorToast";

export default async function runNoViewMultiCommand<T extends unknown[], R>(
  multiFunction: (...args: T) => Promise<R>,
  ...args: T
): Promise<void> {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  try {
    await multiFunction(...args);
  } catch (error) {
    showMultiScriptErrorToastAndLogError(error, multiFunction.name);
  }
}
