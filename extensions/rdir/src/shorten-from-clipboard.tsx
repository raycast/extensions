import { showToast, Toast, Clipboard, getPreferenceValues, showHUD, openExtensionPreferences } from "@raycast/api";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Check if API key is configured
  if (!preferences.apiKey || preferences.apiKey.trim() === "") {
    await showToast({
      style: Toast.Style.Failure,
      title: "API Key Required",
      message: "Click to open settings",
      primaryAction: {
        title: "Open Extension Settings",
        onAction: async () => {
          await openExtensionPreferences();
        },
      },
    });
    return;
  }

  try {
    // Read URL from clipboard
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    // Validate URL
    try {
      new URL(clipboardText);
    } catch {
      await showHUD("❌ Clipboard doesn't contain a valid URL");
      return;
    }

    // Show loading state
    await showHUD("⏳ Creating short link...");

    // Create short link
    const response = await fetch("https://rdir.pl/api/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${preferences.apiKey}`,
      },
      body: JSON.stringify({
        url: clipboardText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create short link: ${response.statusText}`);
    }

    const data = await response.json();
    const shortUrl = data.shortUrl || data.short_url || data.url;

    // Copy to clipboard
    await Clipboard.copy(shortUrl);
    await showHUD(`✅ Short link copied: ${shortUrl}`);
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
