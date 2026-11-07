import { open, showToast, Toast } from "@raycast/api";
import { normalizeServerUrl } from "./lib/memos";
import { getPreferences } from "./lib/preferences";

export default async function Command() {
  try {
    await open(normalizeServerUrl(getPreferences().serverUrl));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Memos",
      message: error instanceof Error ? error.message : "Check the Memos URL preference.",
    });
  }
}
