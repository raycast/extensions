import { closeMainWindow, popToRoot } from "@raycast/api";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";
import { CallbackUrl } from "./utils/CallbackUrlUtils";
import { CallbackBasUrls } from "./utils/Defines";

export default async () => {
  // app installation check (shows Toast if Drafts is not installed)
  if (await checkAppInstallation()) {
    const callbackUrl = new CallbackUrl(CallbackBasUrls.DICTATE);
    await callbackUrl.openCallbackUrl();
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }
};
