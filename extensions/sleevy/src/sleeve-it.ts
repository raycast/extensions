import { Clipboard, showHUD } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import type {
  CapturePayload,
  CaptureResponse,
  InvalidUrlError,
} from "./contract";

import { authorize, deviceName, oauthClient } from "./oauth";
import { getSleevyPreferences } from "./preferences";

function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function sleeveIt() {
  const preferences = getSleevyPreferences();
  const { token } = getAccessToken();

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

    const payload: CapturePayload = {
      url: trimmedText,
      captureChannel: "raycast",
      sourceName: preferences.sourceName || deviceName(),
    };
    const response = await fetch(`${preferences.apiUrl}/v1/captures`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      const data = (await response.json()) as CaptureResponse;
      if (data.captureResult === "created") {
        await showHUD("✅ Saved to Sleevy!");
      } else {
        await showHUD("✅ Already in Sleevy (moved to top)");
      }
    } else if (response.status === 200) {
      const data = (await response.json()) as CaptureResponse;
      if (data.captureResult === "updated") {
        await showHUD("✅ Already in Sleevy (moved to top)");
      } else {
        await showHUD(
          `❌ Unexpected response (HTTP 200, result: ${data.captureResult})`,
        );
      }
    } else if (response.status === 400) {
      const error = (await response.json()) as InvalidUrlError;
      await showHUD(`❌ Invalid URL: ${error.url}`);
    } else if (response.status === 401) {
      await oauthClient.removeTokens();
      await showHUD("❌ Unauthorized. Run the command again to reconnect.");
    } else {
      await showHUD(`❌ Failed to save (HTTP ${response.status})`);
    }
  } catch (error) {
    await showHUD(
      `❌ Network error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export default withAccessToken({
  client: oauthClient,
  authorize,
})(sleeveIt);
