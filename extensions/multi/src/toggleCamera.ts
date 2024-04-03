import { PopToRootType, closeMainWindow } from "@raycast/api";
import { toggleCamera } from "./lib/multi";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default async () => {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  try {
    await toggleCamera();
  } catch (error) {
    showMultiScriptErrorToast(error);
  }
};
