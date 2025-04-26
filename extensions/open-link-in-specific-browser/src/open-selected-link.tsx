import { getSelectedText, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function openSelectedLink() {
  try {
    const selectedText = await getSelectedText();

    if (!selectedText.trim()) {
      await showHUD("No text selected");
      return;
    }

    let url = selectedText.trim();

    // Add http:// prefix if the URL doesn't have a protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    await open(url);
    await showHUD(`Opened: ${url}`);
  } catch (error) {
    await showFailureToast(String(error));
  }
}
