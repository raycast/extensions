/**
 * Shared hook for basic clipboard operations
 */
import { Clipboard, showHUD } from "@raycast/api";
import { useCallback } from "react";

interface UseClipboardActionsOptions {
  /** Format the HUD message for copy action */
  formatCopyMessage?: (text: string) => string;
  /** Format the HUD message for paste action */
  formatPasteMessage?: (text: string) => string;
}

interface UseClipboardActionsResult {
  /** Copy text to clipboard and show HUD */
  copyToClipboard: (text: string) => Promise<void>;
  /** Paste text and show HUD */
  pasteText: (text: string) => Promise<void>;
}

const defaultCopyMessage = (text: string) => `Copied: ${text}`;
const defaultPasteMessage = (text: string) => `Pasted: ${text}`;

export function useClipboardActions(options: UseClipboardActionsOptions = {}): UseClipboardActionsResult {
  const { formatCopyMessage = defaultCopyMessage, formatPasteMessage = defaultPasteMessage } = options;

  const copyToClipboard = useCallback(
    async (text: string) => {
      await Clipboard.copy(text);
      await showHUD(formatCopyMessage(text));
    },
    [formatCopyMessage],
  );

  const pasteText = useCallback(
    async (text: string) => {
      await Clipboard.paste(text);
      await showHUD(formatPasteMessage(text));
    },
    [formatPasteMessage],
  );

  return {
    copyToClipboard,
    pasteText,
  };
}
