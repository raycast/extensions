import { Clipboard, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import { ImageFormat } from "./lib/api";
import { getActiveTabUrl, getClient, getDefaults, saveToSupport, showError } from "./lib/raycast";

export default async function Command() {
  const url = await getActiveTabUrl();
  if (!url) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No browser tab found",
      message: "Open a web page in Safari or a Chromium browser, or install the Raycast Browser Extension.",
    });
    return;
  }

  const defaults = getDefaults();
  // The clipboard needs an image, so a PDF default falls back to PNG here.
  const format: ImageFormat = defaults.format === "pdf" ? "png" : defaults.format;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Capturing current tab", message: url });

  try {
    const shot = await getClient().screenshot({ url, format, device: defaults.device });
    const filePath = await saveToSupport(url, shot);
    await Clipboard.copy({ file: filePath });
    await toast.hide();
    await closeMainWindow();
    await showHUD("Screenshot copied to clipboard");
  } catch (error) {
    await toast.hide();
    await showError("Screenshot failed", error);
  }
}
