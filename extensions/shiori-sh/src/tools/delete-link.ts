import { Action, Tool, showToast, Toast } from "@raycast/api";
import { deleteLink, fetchLinks } from "../api";
import { Link } from "../types";

type Input = {
  /**
   * The ID of the link to delete.
   */
  linkId: string;
};

/**
 * Confirmation dialog before deleting a link.
 */
export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  try {
    // Fetch links to find the one being deleted
    const result = await fetchLinks({ limit: 100, read: "all", sort: "newest" });
    const link = result.links.find((l: Link) => l.id === input.linkId);

    if (!link) {
      return {
        message: "Are you sure you want to delete this link?",
      };
    }

    return {
      style: Action.Style.Destructive,
      message: `Delete "${link.title || link.url}"? This cannot be undone.`,
      info: [
        { name: "Title", value: link.title || "No title" },
        { name: "URL", value: link.url },
        { name: "Domain", value: link.domain },
      ],
    };
  } catch {
    return {
      style: Action.Style.Destructive,
      message: "Are you sure you want to delete this link? This cannot be undone.",
    };
  }
};

/**
 * Permanently delete a bookmark from the user's Shiori library.
 */
export default async function tool(input: Input): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteLink(input.linkId);

    await showToast(Toast.Style.Success, "Link deleted");

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    await showToast(Toast.Style.Failure, "Failed to delete link", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
