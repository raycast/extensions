import { Clipboard, showToast, Toast, getSelectedText } from "@raycast/api";
import { cuidToUuid, extractCuidsFromText } from "./utils";

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
        message: "Select text or copy a CUID to clipboard",
      });
      return;
    }

    // Extract CUIDs from the text
    const cuids = extractCuidsFromText(text);

    if (cuids.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid CUIDs found",
        message: "The text doesn't contain any valid CUIDs",
      });
      return;
    }

    // Convert CUIDs to UUIDs
    const uuids: string[] = [];
    const conversions: string[] = [];

    for (const cuid of cuids) {
      try {
        const uuid = cuidToUuid(cuid);
        uuids.push(uuid);
        conversions.push(`${cuid} → ${uuid}`);
      } catch (error) {
        console.error(`Failed to convert CUID ${cuid}:`, error);
      }
    }

    if (uuids.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: "Could not convert any CUIDs to UUIDs",
      });
      return;
    }

    // Copy UUIDs to clipboard
    const result = uuids.length === 1 ? uuids[0] : uuids.join("\n");
    await Clipboard.copy(result);

    // Show success message
    const message = uuids.length === 1 ? `Converted: ${conversions[0]}` : `Converted ${uuids.length} CUIDs to UUIDs`;

    await showToast({
      style: Toast.Style.Success,
      title: "Conversion successful",
      message: message,
    });

    // Also paste the result if it's a single UUID
    if (uuids.length === 1) {
      await Clipboard.paste(uuids[0]);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
