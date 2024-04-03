import { PopToRootType, closeMainWindow } from "@raycast/api";
import { copyCallLink } from "./lib/multi";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default async () => {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  try {
    await copyCallLink();
  } catch (error) {
    showMultiScriptErrorToast(error);
  }
};
