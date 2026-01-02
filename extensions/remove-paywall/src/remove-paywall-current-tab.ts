import { showHUD, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { DEFAULT_REMOVE_PAYWALL_SERVICE } from "./constants";
import { showFailureToast } from "@raycast/utils";
import { getCurrentTabURL, openURL, getRemovePaywallURL } from "./utils";

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const currentURL = await getCurrentTabURL();
    const result = getRemovePaywallURL(currentURL, preferences.service || DEFAULT_REMOVE_PAYWALL_SERVICE);

    await closeMainWindow();
    await openURL(result);
    await showHUD("Paywall Removed");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to remove paywall" });
  }
}
