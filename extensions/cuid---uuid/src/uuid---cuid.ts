import { Clipboard, showToast, Toast, getSelectedText } from "@raycast/api";
import { uuidToCuid, extractUuidsFromText } from "./utils";

export default async function Command() {
  try {
    // Try to get selected text first, otherwise get clipboard content
    let text = "";
    try {
      text = await getSelectedText();
    } catch {
      // If no text is selected, get from clipboard
      const clipboardContent = await Clipboard.readText();
      if (clipboardContent) {
        text = clipboardContent;
      }
    }

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text found",
        message: "Select text or copy a UUID to clipboard",
      });
      return;
    }

    // Extract UUIDs from the text
    const uuids = extractUuidsFromText(text);

    if (uuids.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid UUIDs found",
        message: "The text doesn't contain any valid nil UUIDs (version 0)",
      });
      return;
    }

    // Convert UUIDs to CUIDs
    const cuids: string[] = [];
    const conversions: string[] = [];

    for (const uuid of uuids) {
      try {
        const cuid = uuidToCuid(uuid);
        cuids.push(cuid);
        conversions.push(`${uuid} → ${cuid}`);
      } catch (error) {
        console.error(`Failed to convert UUID ${uuid}:`, error);
      }
    }

    if (cuids.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: "Could not convert any UUIDs to CUIDs. Only nil UUIDs (version 0) can be converted.",
      });
      return;
    }

    // Copy CUIDs to clipboard
    const result = cuids.length === 1 ? cuids[0] : cuids.join("\n");
    await Clipboard.copy(result);

    // Show success message
    const message = cuids.length === 1 ? `Converted: ${conversions[0]}` : `Converted ${cuids.length} UUIDs to CUIDs`;

    await showToast({
      style: Toast.Style.Success,
      title: "Conversion successful",
      message: message,
    });

    // Also paste the result if it's a single CUID
    if (cuids.length === 1) {
      await Clipboard.paste(cuids[0]);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
