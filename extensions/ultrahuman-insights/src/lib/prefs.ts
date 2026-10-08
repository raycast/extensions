import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";

export function getApiToken(): string {
  const { apiToken } = getPreferenceValues<Preferences>();
  return apiToken?.trim() ?? "";
}

/** Returns true if the token looks structurally like a JWT (three dot-separated segments, ≥50 chars, no whitespace).
 * Does not validate the signature — use as a cheap format hint only. */
export function isLikelyValidToken(t: string): boolean {
  return t.length >= 50 && !/\s/.test(t) && t.split(".").length === 3;
}

/** Show a toast prompting the user to open preferences. Use when the token is missing or 401s. */
export async function promptForToken(reason: "missing" | "invalid"): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: reason === "missing" ? "Ultrahuman API token not set" : "Ultrahuman API token rejected",
    message: "Open preferences to fix",
    primaryAction: {
      title: "Open Preferences",
      onAction: () => openExtensionPreferences(),
    },
  });
}
