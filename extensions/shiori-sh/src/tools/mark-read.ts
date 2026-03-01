import { showToast, Toast } from "@raycast/api";
import { updateLinks } from "../api";

type Input = {
  /**
   * The ID of the link to mark as read.
   */
  linkId: string;
};

/**
 * Mark one or more bookmarks as read.
 */
export default async function tool(input: Input): Promise<{ success: boolean; updated?: number; error?: string }> {
  try {
    const result = await updateLinks([input.linkId], true);

    await showToast(
      Toast.Style.Success,
      "Marked as read",
      `${result.updated} link${result.updated === 1 ? "" : "s"} updated`,
    );

    return {
      success: true,
      updated: result.updated,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    await showToast(Toast.Style.Failure, "Failed to mark as read", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
