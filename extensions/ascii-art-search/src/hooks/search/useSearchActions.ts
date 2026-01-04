/**
 * Hook for clipboard and art action handlers
 */
import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { useCallback, useMemo } from "react";
import type { Kaomoji } from "../../types";
import { getUnicodeCodePoints } from "../../lib/svg";
import { truncateForHud } from "../../lib/utils";
import { UI_CONFIG } from "../../constants";
import { useClipboardActions } from "../shared";

interface UseSearchActionsOptions {
  visitItem: (item: Kaomoji) => void;
}

interface UseSearchActionsResult {
  handleCopy: (item: Kaomoji) => Promise<void>;
  handlePaste: (item: Kaomoji) => Promise<void>;
  handlePasteKeepOpen: (item: Kaomoji) => Promise<void>;
  handleCopyUnicode: (item: Kaomoji) => Promise<void>;
  handleCopyAllFromSection: (items: Kaomoji[]) => Promise<void>;
}

export function useSearchActions({ visitItem }: UseSearchActionsOptions): UseSearchActionsResult {
  const formatMessage = useMemo(() => (prefix: string) => (text: string) => `${prefix}: ${truncateForHud(text)}`, []);

  const { copyToClipboard, pasteText } = useClipboardActions({
    formatCopyMessage: formatMessage("Copied"),
    formatPasteMessage: formatMessage("Pasted"),
  });

  const handleCopy = useCallback(
    async (item: Kaomoji) => {
      await copyToClipboard(item.text);
      await visitItem(item);
    },
    [copyToClipboard, visitItem],
  );

  const handlePaste = useCallback(
    async (item: Kaomoji) => {
      await Clipboard.paste(item.text);
      await closeMainWindow();
      await visitItem(item);
    },
    [visitItem],
  );

  const handlePasteKeepOpen = useCallback(
    async (item: Kaomoji) => {
      await pasteText(item.text);
      await visitItem(item);
    },
    [pasteText, visitItem],
  );

  const handleCopyUnicode = useCallback(async (item: Kaomoji) => {
    const unicode = getUnicodeCodePoints(item.text);
    await Clipboard.copy(unicode);
    await showHUD(`Copied: ${truncateForHud(unicode, UI_CONFIG.hudUnicodeMaxLength)}`);
  }, []);

  const handleCopyAllFromSection = useCallback(async (items: Kaomoji[]) => {
    const allText = items.map((item) => item.text).join(" ");
    await Clipboard.copy(allText);
    await showHUD(`Copied ${items.length} items`);
  }, []);

  return {
    handleCopy,
    handlePaste,
    handlePasteKeepOpen,
    handleCopyUnicode,
    handleCopyAllFromSection,
  };
}
