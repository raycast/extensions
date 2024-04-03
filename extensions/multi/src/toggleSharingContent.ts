import { PopToRootType, closeMainWindow } from "@raycast/api";
import { toggleSharingContent } from "./lib/multi";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default async () => {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  try {
    await toggleSharingContent();
  } catch (error) {
    showMultiScriptErrorToast(error);
  }
};
