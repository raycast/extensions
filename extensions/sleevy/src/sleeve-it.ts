import { Clipboard, openExtensionPreferences, showHUD } from "@raycast/api";
import os from "node:os";
import { getSleevyPreferences } from "./preferences";

function prettyHostname(): string {
  return (
    os
      .hostname()
      .replace(/\.local$/, "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Desktop"
  );
}

function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function main() {
  const preferences = getSleevyPreferences();

  if (!preferences.apiUrl || !preferences.apiKey) {
    await showHUD(
      "Configuration required. Please set API URL and API Key in preferences.",
    );
    await openExtensionPreferences();
    return;
  }

  const clipboardText = await Clipboard.readText();

  if (!clipboardText) {
    await showHUD("Clipboard is empty");
    return;
  }

  const trimmedText = clipboardText.trim();

  if (!isValidUrl(trimmedText)) {
    await showHUD("Clipboard does not contain a valid URL");
    return;
  }

  try {
    await showHUD("📎 Saving to Sleevy...");

    const response = await fetch(`${preferences.apiUrl}/v1/captures`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: trimmedText,
        captureChannel: "raycast" as const,
        sourceName: preferences.sourceName || prettyHostname(),
      }),
    });

    if (response.status === 201) {
      const data = (await response.json()) as { captureResult: string };
      if (data.captureResult === "created") {
        await showHUD("✅ Saved to Sleevy!");
      } else {
        await showHUD("✅ Already in Sleevy (moved to top)");
      }
    } else if (response.status === 200) {
      const data = (await response.json()) as { captureResult: string };
      if (data.captureResult === "updated") {
        await showHUD("✅ Already in Sleevy (moved to top)");
      } else {
        await showHUD("✅ Saved to Sleevy!");
      }
    } else if (response.status === 400) {
      const error = (await response.json()) as { url: string };
      await showHUD(`❌ Invalid URL: ${error.url}`);
    } else if (response.status === 401) {
      await showHUD("❌ Unauthorized. Check your API Key.");
      await openExtensionPreferences();
    } else {
      await showHUD(`❌ Failed to save (HTTP ${response.status})`);
    }
  } catch (error) {
    await showHUD(
      `❌ Network error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
