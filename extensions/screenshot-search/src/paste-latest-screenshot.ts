import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { loadMediaItems } from "./lib/media";
import type { ScreenshotPreferences } from "./lib/media";

export default async function PasteLatestScreenshot() {
  const preferences = getPreferenceValues<ScreenshotPreferences>();
  const scannedItems = await loadMediaItems(preferences);
  const latest = scannedItems.find((item) => item.kind === "image");

  if (!latest) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Screenshot Found",
      message: "Add a screenshot folder in the extension preferences.",
    });
    return;
  }

  try {
    await Clipboard.paste({ file: latest.path });
    await showToast({
      style: Toast.Style.Success,
      title: "Pasted Latest Screenshot",
      message: latest.name,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Paste Screenshot",
      message:
        error instanceof Error
          ? error.message
          : "The screenshot could not be pasted",
    });
  }
}
