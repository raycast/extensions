import { PopToRootType, closeMainWindow } from "@raycast/api";
import { startNewSession } from "./lib/multi";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default async () => {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  try {
    await startNewSession();
  } catch (error) {
    showMultiScriptErrorToast(error);
  }
};
