import { useState, useEffect } from "react";
import { Clipboard } from "@raycast/api";
import { ClipboardError } from "../../utils/errors";
import { ERROR_MESSAGES } from "../../core/constants";

export function useClipboard() {
  const [clipboardText, setClipboardText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClipboardText();
  }, []);

  const loadClipboardText = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const text = await Clipboard.readText();

      if (!text || text.trim().length === 0) {
        throw new ClipboardError(ERROR_MESSAGES.CLIPBOARD_EMPTY);
      }

      setClipboardText(text.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to read clipboard";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshClipboard = () => {
    loadClipboardText();
  };

  return {
    clipboardText,
    isLoading,
    error,
    refreshClipboard,
  };
}
