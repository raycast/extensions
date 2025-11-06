import { Clipboard, showHUD, BrowserExtension, environment } from "@raycast/api";
import { convertHtmlToMarkdown } from "./lib/html-to-markdown";

export default async function Command() {
  try {
    // Check if browser extension is available
    if (!environment.canAccess(BrowserExtension)) {
      await showHUD("✗ Browser extension not installed");
      return;
    }

    // Get HTML from the current page
    const html = await BrowserExtension.getContent({
      format: "html",
    });

    // Convert HTML to Markdown using Turndown
    const markdown = convertHtmlToMarkdown(html);

    if (!markdown || markdown.trim().length === 0) {
      await showHUD("✗ No content found on page");
      return;
    }

    await Clipboard.copy(markdown);
    await showHUD("✓ Copied page as Markdown");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error copying page as markdown:", error);
    await showHUD(`✗ Failed: ${errorMessage}`);
  }
}
