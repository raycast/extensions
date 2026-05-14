import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useState } from "react";

interface UseCopyToClipboardReturn {
  copyToClipboard: (text: string, message?: string) => Promise<void>;
  isCopying: boolean;
}

export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [isCopying, setIsCopying] = useState(false);

  const copyToClipboard = useCallback(async (text: string, message?: string) => {
    try {
      setIsCopying(true);
      await Clipboard.copy(text);

      await showToast({
        style: Toast.Style.Success,
        title: "Copy to Clipboard",
        message: message || `"${text}" copied to clipboard`,
      });
    } catch (error) {
      await showFailureToast("Copy Failed", {
        message: "Failed to copy to clipboard",
      });
      console.error("Copy to clipboard failed:", error);
    } finally {
      setIsCopying(false);
    }
  }, []);

  return { copyToClipboard, isCopying };
}
