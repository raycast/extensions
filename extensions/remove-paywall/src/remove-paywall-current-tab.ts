import { showHUD, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCurrentTabURL, openURL, getRemovePaywallURL } from "./utils";

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const currentURL = await getCurrentTabURL();
    const result = getRemovePaywallURL(currentURL, preferences.service || "https://12ft.io");

    await closeMainWindow();
    await openURL(result);
    await showHUD("Paywall Removed");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to remove paywall" });
  }
}
