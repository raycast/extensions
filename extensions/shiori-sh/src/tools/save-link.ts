import { showToast, Toast } from "@raycast/api";
import { createLink } from "../api";

type Input = {
  /**
   * The URL to save to Shiori. Must be a valid HTTP or HTTPS URL.
   */
  url: string;
  /**
   * Optional custom title for the bookmark. If not provided, Shiori will extract the title from the page.
   */
  title?: string;
};

/**
 * Save a URL to the user's Shiori bookmark library.
 */
export default async function tool(
  input: Input,
): Promise<{ success: boolean; linkId?: string; duplicate?: boolean; error?: string }> {
  try {
    // Normalize URL
    const normalizedUrl = input.url.startsWith("http") ? input.url : `https://${input.url}`;

    const result = await createLink(normalizedUrl, input.title);

    if (result.duplicate) {
      await showToast(Toast.Style.Success, "Already saved", normalizedUrl);
    } else {
      await showToast(Toast.Style.Success, "Link saved", normalizedUrl);
    }

    return {
      success: true,
      linkId: result.linkId,
      duplicate: result.duplicate,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    await showToast(Toast.Style.Failure, "Failed to save link", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
