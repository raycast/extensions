import { Clipboard, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { PageInfo, getActiveTabContent } from "./utils/page-content-extractor";
import { formatForTana } from "./utils/tana-formatter";

const execAsync = promisify(exec);

/**
 * Enhanced Copy Page Content to Tana
 *
 * Uses the Raycast Browser Extension's reader mode to extract clean content,
 * then applies comprehensive metadata extraction and proper hierarchical formatting.
 *
 * FEATURES:
 * - Leverages Raycast's built-in reader mode for intelligent content extraction
 * - Extracts rich metadata (title, description, author, URL)
 * - Converts headings to parent nodes (not Tana headings)
 * - Maintains proper content hierarchy under headings
 * - Automatically filters out ads, navigation, and other noise
 */

/**
 * Extract content from the active browser tab and convert to Tana Paste format
 *
 * Uses Raycast Browser Extension to extract clean page content using reader mode,
 * then converts it to Tana format with proper metadata (title, URL, description, author).
 * Automatically opens Tana application after copying content to clipboard.
 *
 * Requirements:
 * - Raycast Browser Extension must be installed and enabled
 * - A browser tab must be open and focused
 *
 * @returns Promise that resolves when command completes
 */
export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Extracting Page Content",
  });

  try {
    // Get content and tab info from focused window's active tab
    const { content, tabInfo, metadata } = await getActiveTabContent();

    toast.message = "Converting to Tana format...";

    // Combine all info using the metadata already fetched
    const pageInfo: PageInfo = {
      title: metadata.title || tabInfo.title || "Web Page",
      url: metadata.url || tabInfo.url,
      description: metadata.description,
      author: metadata.author,
      content,
    };

    console.log(
      `🔍 Final page info - Title: "${pageInfo.title}", Content length: ${pageInfo.content.length}`,
    );

    toast.message = "Converting to Tana format...";

    // Format for Tana using unified formatter
    const tanaFormat = formatForTana({
      title: pageInfo.title,
      url: pageInfo.url,
      description: pageInfo.description,
      author: pageInfo.author,
      content: pageInfo.content,
      articleTag: preferences.articleTag,
      urlField: preferences.urlField,
      authorField: preferences.authorField,
      transcriptField: preferences.transcriptField,
      contentField: preferences.contentField,
      includeAuthor: preferences.includeAuthor,
      includeDescription: preferences.includeDescription,
    });
    await Clipboard.copy(tanaFormat);

    // Open Tana and update toast to success
    try {
      await execAsync("open tana://");
      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = "Page content copied to clipboard and Tana opened";
    } catch (error) {
      console.error("Error opening Tana:", error);
      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = "Page content copied to clipboard (could not open Tana)";
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    toast.style = Toast.Style.Failure;
    toast.title = "Failed to extract page content";
    toast.message = errorMessage;

    console.error("Page content extraction error:", error);
  }
}
