import { ActionPanel, Action, Icon, Keyboard, showToast, Toast, openExtensionPreferences } from "@raycast/api";
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

  const pasteInActiveApp = useMemo(
    () => (
      <Action.Paste
        title="Paste in Active App"
        content={searchResult.name}
        icon={Icon.Clipboard}
        onPaste={() => addKaomoji(searchResult)}
        key="paste-in-active-app"
      />
    ),
    [searchResult, addKaomoji],
  );

  const copyToClipboard = useMemo(
    () => (
      <Action.CopyToClipboard
        title="Copy to Clipboard"
        content={searchResult.name}
        icon={Icon.Clipboard}
        onCopy={() => {
          addKaomoji(searchResult);
        }}
        key="copy-to-clipboard"
      />
    ),
    [searchResult, addKaomoji],
  );

  const isPinned = isFavorite(searchResult);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(searchResult);
    showToast({
      title: isPinned ? "Unpinned from Favorites" : "Pinned to Favorites",
      style: Toast.Style.Success,
    });
  }, [toggleFavorite, searchResult, isPinned]);

  const actions = useMemo(() => {
    if (primaryAction === "copy-to-clipboard") {
      return [copyToClipboard, pasteInActiveApp];
    } else {
      return [pasteInActiveApp, copyToClipboard];
    }
  }, [primaryAction, copyToClipboard, pasteInActiveApp]);

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
