import { useEffect, useState } from "react";
import { Clipboard, showToast, Toast } from "@raycast/api";
import { messages } from "@/locale/en/messages";

/**
 * Return type for the useClipboard hook
 */
interface UseClipboardReturn {
  /** The current text content from the clipboard, empty string if no text or if clipboard contains Claude auth token */
  clipboardText: string;
  /** Whether the clipboard reading operation is currently in progress */
  isLoading: boolean;
}

export function useClipboard(): UseClipboardReturn {
  const [clipboardText, setClipboardText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load clipboard on mount
  useEffect(() => {
    async function loadClipboard() {
      setIsLoading(true);
      try {
        const text = await Clipboard.readText();
        if (text && !text.startsWith("sk-")) {
          setClipboardText(text);
        }
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: messages.toast.clipboardAccessFailed,
          message: messages.errors.unableToReadClipboard,
        });
      } finally {
        setIsLoading(false);
      }
    }

    void loadClipboard();
  }, []);

  return {
    clipboardText,
    isLoading,
  };
}
