import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/**
 * Hook for clipboard operations
 * @returns Object with clipboard functions
 */
export function useClipboard() {
  /**
   * Copy text to clipboard and show a toast notification
   * @param text Text to copy
   * @param toastTitle Title for the toast notification
   * @param toastMessage Optional message for the toast notification
   */
  const copyToClipboard = async (text: string, toastTitle: string, toastMessage = "Copied to clipboard") => {
    try {
      await Clipboard.copy(text);
      showToast(Toast.Style.Success, toastTitle, toastMessage);
    } catch (error) {
      showFailureToast(error, { title: "Failed to copy to clipboard" });
    }
  };

  return {
    copyToClipboard,
  };
}
