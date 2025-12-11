import { getPreferenceValues, showToast, Toast, showHUD, LaunchProps } from "@raycast/api";

interface Preferences {
  apiKey: string;
  username: string;
}

interface Arguments {
  url?: string;
  title?: string;
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { url, title } = props.arguments;

  const trimmedUrl = url?.trim();
  const trimmedTitle = title?.trim();

  // Must have at least one
  if (!trimmedUrl && !trimmedTitle) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing input",
      message: "Please provide a URL or title",
    });
    return;
  }

  // If URL provided, validate it
  if (trimmedUrl && !isValidUrl(trimmedUrl)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL",
      message: trimmedUrl.substring(0, 50) + (trimmedUrl.length > 50 ? "..." : ""),
    });
    return;
  }

  const preferences = getPreferenceValues<Preferences>();

  // Build request body
  const body: Record<string, string> = {
    source: "raycast",
  };

  if (trimmedUrl) {
    body.url = trimmedUrl;
  }

  if (trimmedTitle) {
    body.title = trimmedTitle;
  }

  try {
    const response = await fetch("https://mnemos.xyz/api/mnemes/add", {
      method: "POST",
      headers: {
        "X-API-Key": preferences.apiKey,
        "X-Username": preferences.username,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
