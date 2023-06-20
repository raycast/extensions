import { Toast, getPreferenceValues, popToRoot, showHUD, showToast } from "@raycast/api";
import { capitalize } from "~/utils/strings";

/** Displays a HUD or Toast and closes the window or not, depending on the preferences. */
export async function showCopySuccessMessage(title: string, message?: string) {
  const action = getPreferenceValues<Preferences>().windowActionOnCopy;
  const messageTitle = capitalize(title, true);

  if (action === "keepOpen") {
    await showToast({ title: messageTitle, message, style: Toast.Style.Success });
  } else if (action === "closeAndPopToRoot") {
    await showHUD(messageTitle);
    await popToRoot();
  } else {
    await showHUD(messageTitle);
  }
}
