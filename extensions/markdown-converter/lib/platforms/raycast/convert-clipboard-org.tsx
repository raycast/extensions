import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { raycastConverter } from "./raycast-converter.js";
import { convertMarkdownToOrg } from "../../core/md-to-org.js";
import { ImageHandlingMode } from "../../core/converter.js";

/**
 * Raycast command to convert clipboard rich text to Org-mode format.
 * Reads HTML from clipboard, converts to Markdown, then to Org syntax.
 */
export default async function ConvertClipboardToOrg() {
  const preferences = getPreferenceValues<{ imageHandling: ImageHandlingMode }>();

  try {
    // First convert to Markdown
    const markdown = await raycastConverter.convertFromClipboard({
      imageHandling: preferences.imageHandling
    });

    if (markdown.trim()) {
      // Then convert Markdown to Org
      const org = convertMarkdownToOrg(markdown);
      await Clipboard.copy(org);
      await showHUD("✓ Converted to Org");
    } else {
      await showHUD("✗ No rich text found in clipboard");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showHUD(`✗ Conversion failed: ${errorMessage}`);
  }
}
