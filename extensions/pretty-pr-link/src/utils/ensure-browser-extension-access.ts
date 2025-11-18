import { BrowserExtension, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function ensureBrowserExtensionAccess() {
  const canAccessBrowserExtension = environment.canAccess(BrowserExtension);

  if (!canAccessBrowserExtension) {
    await showFailureToast(
      "You need to install the browser extension to use this command",
    );
    return;
  }
}
