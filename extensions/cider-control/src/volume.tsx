import { showToast, Toast, getPreferenceValues, LaunchProps } from "@raycast/api";

interface Preferences {
  token: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments.Volume }>) {
  const preferences = getPreferenceValues<Preferences>();
  const BASE_URL = "http://localhost:10767/api/v1";
  const { volume } = props.arguments;

  try {
    const response = await fetch(`${BASE_URL}/playback/volume`, {
      method: "POST",
      headers: {
        apitoken: preferences.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ volume: parseInt(volume) / 100 }),
    });

    if (response.ok) {
      // TODO fill
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
