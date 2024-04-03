import { PopToRootType, closeMainWindow } from "@raycast/api";
import { leaveSession } from "./lib/multi";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default async () => {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  try {
    await leaveSession();
  } catch (error) {
    showMultiScriptErrorToast(error);
  }
};
