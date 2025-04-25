import { getSelectedText, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { CallbackUrl } from "./utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "./utils/Defines";

export default async () => {
  // app installation check (shows Toast if Drafts is not installed)
  if (await checkAppInstallation()) {
    const callbackUrl = new CallbackUrl(CallbackBaseUrls.CREATE_DRAFT);
    try {
      const selectedText = await getSelectedText();
      callbackUrl.addParam({ name: "text", value: selectedText });
      await callbackUrl.openCallbackUrl();
      await popToRoot({ clearSearchBar: true });
      await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "no text selected",
        message: String(error),
      });
    }
  }
};
