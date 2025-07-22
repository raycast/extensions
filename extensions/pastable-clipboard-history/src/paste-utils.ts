import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";

export async function pasteClipboardAtPosition(
  offset: number,
  positionName: string
): Promise<void> {
  console.log(`🔍 [PASTE] Starting paste operation for ${positionName} (offset: ${offset})`);

  try {
    console.log(`📋 [PASTE] Reading clipboard content at offset ${offset}...`);
    // Read clipboard content at the specified offset
    const content = await Clipboard.readText({ offset });

    console.log(`📋 [PASTE] Content read:`, {
      hasContent: !!content,
      length: content?.length || 0,
      preview: content
        ? content.length > 30
          ? content.substring(0, 30) + "..."
          : content
        : "null",
    });

    if (!content || content.trim() === "") {
      console.log(`❌ [PASTE] No content found at offset ${offset}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "No Content",
        message: `No clipboard content found at ${positionName} position`,
      });
      return;
    }

    console.log(
      `📤 [PASTE] Attempting to paste content: "${content.substring(0, 50)}${content.length > 50 ? "..." : ""}"`
    );

    // Paste the content
    await Clipboard.paste(content);

    console.log(`✅ [PASTE] Successfully pasted content`);
    console.log(`🎯 [PASTE] Operation completed successfully for ${positionName}`);

    // Show success feedback
    await showHUD(
      `Pasted from ${positionName}: ${content.substring(0, 30)}${content.length > 30 ? "..." : ""}`
    );
  } catch (error) {
    console.error(`❌ [PASTE] Error during paste operation for ${positionName}:`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Paste Failed",
      message: `Failed to paste from ${positionName}: ${error}`,
    });
  }
}
