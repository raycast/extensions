import { open, showToast, Toast } from "@raycast/api";
import { getPreferences } from "./api";

export default async function Command() {
  try {
    const preferences = getPreferences();
    await open(preferences.webUrl);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Control UI",
      message:
        error instanceof Error
          ? error.message
          : "The configured Gateway URL is unavailable.",
    });
  }
}
