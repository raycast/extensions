import { open, showToast, Toast } from "@raycast/api";
import { getPreferences } from "./api";

export default async function Command() {
  try {
    const prefs = getPreferences<Preferences>();
    // The webchat is typically served from the gateway endpoint
    const webchatUrl = prefs.endpoint.replace(/\/+$/, "");
    await open(webchatUrl);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message:
        error instanceof Error ? error.message : "Failed to open webchat",
    });
  }
}
