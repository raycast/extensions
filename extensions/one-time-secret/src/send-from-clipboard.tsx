import { Clipboard, showToast, Toast } from "@raycast/api";
import { createClientFromPreferences } from "./create-client";

const THREE_HOURS_TTL_SECONDS = 10800;

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
    const client = createClientFromPreferences();
    const response = await client.concealSecret(secret, THREE_HOURS_TTL_SECONDS, null);
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
