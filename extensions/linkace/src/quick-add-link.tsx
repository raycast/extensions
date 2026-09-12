import { Clipboard, getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";

interface Arguments {
  url?: string;
}

interface LinkAceResponse {
  id?: number;
  url?: string;
  title?: string;
  message?: string;
  error?: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  // Get URL from arguments or clipboard
  let url = props.arguments.url;

  if (!url) {
    const clipboardText = await Clipboard.readText();
    if (clipboardText && isValidUrl(clipboardText)) {
      url = clipboardText;
    }
  }

  if (!url) {
    await showHUD("❌ No URL found in clipboard or arguments");
    return;
  }

  await showHUD("📤 Adding link to LinkAce...");

  try {
    // Ensure API URL doesn't have trailing slash
    const apiUrl = preferences.apiUrl.replace(/\/$/, "");
    const endpoint = `${apiUrl}/api/v2/links`;

    // Prepare tags array
    const tagsArray = preferences.defaultTags
      ? preferences.defaultTags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    // Prepare request body
    const body = {
      url: url,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      is_private: preferences.isPrivateByDefault ? 1 : 0,
    };

    // Make API request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data: LinkAceResponse = await response.json();

    // Check if link was successfully created (has an ID)
    if (response.ok && data.id) {
      await showHUD("✅ Link saved to LinkAce!");
    } else {
      // Something went wrong
      await showHUD(`❌ Failed: ${data.message || data.error || "Unknown error"}`);
    }
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
