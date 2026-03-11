import { showToast, Toast, getPreferenceValues } from "@raycast/api";

interface Preferences {
  token: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const BASE_URL = "http://localhost:10767/api/v1";

  try {
    const response = await fetch(`${BASE_URL}/playback/playpause`, {
      method: "POST",
      headers: {
        apitoken: preferences.token,
      },
    });

    if (response.ok) {
      await showToast({ style: Toast.Style.Success, title: "Play/Pause" });
    } else {
      const errorText = await response.text();
      console.error("Cider Error:", errorText);
      await showToast({
        style: Toast.Style.Failure,
        title: "Cider Refused Command",
        message: `Status ${response.status}: Check your Token.`,
      });
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection Failed",
      message: "Is Cider running?",
    });
  }
}
