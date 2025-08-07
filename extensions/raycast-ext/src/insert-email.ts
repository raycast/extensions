import { Clipboard, showToast, Toast, getPreferenceValues } from "@raycast/api";

interface Preferences {
  email: string;
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.email) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Email Address",
        message: "Please set your email address in extension preferences",
      });
      return;
    }

    await Clipboard.paste(preferences.email);

    await showToast({
      style: Toast.Style.Success,
      title: "Email Inserted",
      message: preferences.email,
    });
  } catch (error) {
    console.error("Failed to insert email:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Insert Email",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
