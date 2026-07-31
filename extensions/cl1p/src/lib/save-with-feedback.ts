import {
  Clipboard,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { saveToCl1p } from "./cl1p";

export async function saveWithFeedback(
  title: string,
  content: string,
): Promise<void> {
  const { apiToken } = getPreferenceValues<Preferences>();

  await showToast({ style: Toast.Style.Animated, title: "Saving..." });

  try {
    const result = await saveToCl1p(title, content, apiToken);
    if (!result.ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Save failed",
        message: result.message,
      });
      return;
    }

    await Clipboard.copy(result.url);
    await showHUD(
      `Saved · ${result.url} copied to clipboard\nDestroyed after first view`,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Network error",
      message: String(error),
    });
  }
}
