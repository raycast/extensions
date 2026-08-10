import { Clipboard, getPreferenceValues, showToast, Toast, showHUD } from "@raycast/api";

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export default async function Command() {
  const clipboard = await Clipboard.readText();

  if (!clipboard) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
    });
    return;
  }

  const url = clipboard.trim();

  if (!isValidUrl(url)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not a valid URL",
      message: url.substring(0, 50) + (url.length > 50 ? "..." : ""),
    });
    return;
  }

  const preferences = getPreferenceValues<Preferences>();

  try {
    const response = await fetch("https://mnemos.xyz/api/mnemes/add", {
      method: "POST",
      headers: {
        "X-API-Key": preferences.apiKey,
        "X-Username": preferences.username,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        source: "raycast",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    await showHUD("✓ Mneme saved!");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save mneme",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
