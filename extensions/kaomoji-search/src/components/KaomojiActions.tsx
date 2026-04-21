import {
  ActionPanel,
  Action,
  Clipboard,
  Icon,
  Keyboard,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useMemo } from "react";
import { useRecentKaomoji } from "../hooks/useRecentKaomoji";
import { SearchResult } from "../types";

interface KaomojiActionsProps {
  searchResult: SearchResult;
  primaryAction: Preferences["primaryAction"];
  toggleFavorite: (kaomoji: SearchResult) => void;
  isFavorite: (kaomoji: SearchResult) => boolean;
}

export function KaomojiActions({ searchResult, primaryAction, toggleFavorite, isFavorite }: KaomojiActionsProps) {
  const { addKaomoji } = useRecentKaomoji();

  const pasteInActiveApp = useCallback(() => {
    addKaomoji(searchResult);
    Clipboard.paste(searchResult.name);
  }, [addKaomoji, searchResult]);

  const copyToClipboard = useCallback(() => {
    addKaomoji(searchResult);
    Clipboard.copy(searchResult.name);
    showToast({ title: "Copied to Clipboard", style: Toast.Style.Success });
  }, [addKaomoji, searchResult]);

  const isPinned = isFavorite(searchResult);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(searchResult);
    showToast({
      title: isPinned ? "Unpinned from Favorites" : "Pinned to Favorites",
      style: Toast.Style.Success,
    });
  }, [toggleFavorite, searchResult, isPinned]);

  const PasteInActiveAppAction = useMemo(() => {
    return (
      <Action title="Paste in Active App" onAction={pasteInActiveApp} icon={Icon.Clipboard} key="paste-in-active-app" />
    );
  }, [pasteInActiveApp]);

  const CopyToClipboardAction = useMemo(() => {
    return (
      <Action title="Copy to Clipboard" onAction={copyToClipboard} icon={Icon.Clipboard} key="copy-to-clipboard" />
    );
  }, [copyToClipboard]);

  const actions = useMemo(() => {
    if (primaryAction === "copy-to-clipboard") {
      return [CopyToClipboardAction, PasteInActiveAppAction];
    } else {
      return [PasteInActiveAppAction, CopyToClipboardAction];
    }
  }, [primaryAction, CopyToClipboardAction, PasteInActiveAppAction]);

  return (
    <ActionPanel>
      <ActionPanel.Section>{actions}</ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={isPinned ? "Unpin from Favorites" : "Pin to Favorites"}
          onAction={handleToggleFavorite}
          icon={isPinned ? Icon.StarDisabled : Icon.Star}
          shortcut={Keyboard.Shortcut.Common.Pin}
        />
      </ActionPanel.Section>
      <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
    </ActionPanel>
  );
}
