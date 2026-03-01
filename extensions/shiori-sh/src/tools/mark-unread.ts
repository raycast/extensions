import { showToast, Toast } from "@raycast/api";
import { updateLinks } from "../api";

type Input = {
  /**
   * The ID of the link to mark as unread.
   */
  linkId: string;
};

/**
 * Mark one or more bookmarks as unread, moving them back to the inbox.
 */
export default async function tool(input: Input): Promise<{ success: boolean; updated?: number; error?: string }> {
  try {
    const result = await updateLinks([input.linkId], false);

    await showToast(
      Toast.Style.Success,
      "Moved to inbox",
      `${result.updated} link${result.updated === 1 ? "" : "s"} updated`,
    );

    return {
      success: true,
      updated: result.updated,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    await showToast(Toast.Style.Failure, "Failed to mark as unread", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
