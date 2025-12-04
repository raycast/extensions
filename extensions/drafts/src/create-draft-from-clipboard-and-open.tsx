import { Clipboard, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { CallbackUrl } from "./utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "./utils/Defines";
import Style = Toast.Style;

export default async () => {
  // app installation check (shows Toast if Drafts is not installed)
  if (await checkAppInstallation()) {
    const callbackUrl = new CallbackUrl(CallbackBaseUrls.CREATE_DRAFT);
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      callbackUrl.addParam({ name: "text", value: clipboardText });
      await callbackUrl.openCallbackUrl();
    } else {
      await showToast({
        style: Style.Failure,
        title: "Clipboard is empty",
      });
    }

    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }
};
