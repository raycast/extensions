import { showHUD, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCurrentTabURL, openURL, getBypassURL } from "./utils";

export default async function Command() {
  try {
    await closeMainWindow();

    const currentURL = await getCurrentTabURL();
    const result = getBypassURL(currentURL);

    await openURL(result);

    await showHUD("Bypassed URL Opened");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to complete command" });
  }
}
