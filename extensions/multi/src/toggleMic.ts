import { PopToRootType, closeMainWindow } from "@raycast/api";
import { toggleMicrophone } from "./lib/multi";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default async () => {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  try {
    await toggleMicrophone();
  } catch (error) {
    showMultiScriptErrorToast(error);
  }
};
