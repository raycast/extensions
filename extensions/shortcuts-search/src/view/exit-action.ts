import { closeMainWindow, PopToRootType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export function exitWithMessage(message: string) {
  // noinspection JSIgnoredPromiseFromCall
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  // noinspection JSIgnoredPromiseFromCall
  showFailureToast(undefined, { title: message });
}
