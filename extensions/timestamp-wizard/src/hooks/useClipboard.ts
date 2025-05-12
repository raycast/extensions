import { showToast, Toast, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/**
 * Clipboard functionality hook
 * @returns Function to copy to clipboard
 */
export const useClipboard = () => {
  /**
   * Copy content to clipboard and show notification
   * @param content Content to be copied
   */
  const copyToClipboard = async (content: string) => {
    try {
      await Clipboard.copy(content);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Failed to copy to clipboard" });
    }
  };

  return { copyToClipboard };
};
