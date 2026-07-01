import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { createClientFromPreferences } from "./create-client";
import { DEFAULT_TTL_SECONDS } from "./constants";

export default async function Command() {
  const raw = await Clipboard.readText();
  const secret = raw?.trim() ?? "";

  if (secret.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to send",
      message: "Clipboard is empty or whitespace only.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Storing secret",
  });

  try {
    const { lifetime } = getPreferenceValues<Preferences.SendFromClipboard>();
    const ttlSeconds = Number.parseInt(lifetime, 10) || DEFAULT_TTL_SECONDS;
    const client = createClientFromPreferences();
    const response = await client.concealSecret(secret, ttlSeconds, null);
    await Clipboard.copy(client.getShareableUrl(response.secretIdentifier));

    toast.style = Toast.Style.Success;
    toast.title = "Shared secret";
    toast.message = "Copied link to clipboard";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed sharing secret";
    toast.message = String(error);
  }
}
