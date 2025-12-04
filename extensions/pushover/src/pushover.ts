import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

export default async function Command(props: { arguments: { message: string } }) {
  try {
    const preferences = getPreferenceValues<Preferences>();

    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: preferences.pushoverToken,
        user: preferences.pushoverUser,
        message: props.arguments.message,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Notification sent successfully!",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to send notification",
      message: String(error),
    });
  }
}
