/**
 * Hook for ASCII art action handlers (copy, paste, save)
 */
import { showToast, Toast } from "@raycast/api";
import { useCallback } from "react";
import { addCustomArt, type CustomArt } from "../../lib/storage";
import { t } from "../../constants";
import { useClipboardActions } from "../shared";

interface UseGenerateActionsOptions {
  text: string;
}

interface UseGenerateActionsResult {
  handleCopy: (art: string) => Promise<void>;
  handlePaste: (art: string) => Promise<void>;
  handleSave: (art: string, fontName: string) => Promise<void>;
}

export function useGenerateActions({ text }: UseGenerateActionsOptions): UseGenerateActionsResult {
  const { copyToClipboard, pasteText } = useClipboardActions({
    formatCopyMessage: () => `✓ ${t("toasts.copiedToClipboard")}`,
    formatPasteMessage: () => `✓ ${t("toasts.pastedSuccess")}`,
  });

  const handleCopy = useCallback(
    async (art: string) => {
      await copyToClipboard(art);
    },
    [copyToClipboard],
  );

  const handlePaste = useCallback(
    async (art: string) => {
      await pasteText(art);
    },
    [pasteText],
  );

  const handleSave = useCallback(
    async (art: string, fontName: string) => {
      const customArt: CustomArt = {
        text: art,
        name: `${text} (${fontName})`,
        font: fontName,
        createdAt: Date.now(),
      };
      try {
        await addCustomArt(customArt);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: t("toasts.failedToSave") });
      }
    },
    [text],
  );

  return { handleCopy, handlePaste, handleSave };
}
