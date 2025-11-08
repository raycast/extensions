import { useMemo } from "react";
import { Action, ActionPanel, Icon, getFrontmostApplication } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { Character } from "@/types";
import { primaryAction } from "@/lib/preferences";
import { useListContext } from "@/context/ListContext";
import { useCharacterFormatting } from "@/hooks/use-character-formatting";

export const CharacterActionPanel = ({ item, section }: { item: Character; section?: string }) => {
  const { data: frontmostApp } = usePromise(getFrontmostApplication, []);
  const { findHtmlEntity, setDatasetFilterAnd, filter } = useListContext();
  const html = findHtmlEntity(item.c);
  const formatting = useCharacterFormatting(item);

  const {
    addToRecentlyUsedItems,
    isRecentlyUsed,
    clearRecentlyUsedItems,
    removeFromRecentlyUsedItems,
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    isFavorite,
  } = useListContext();
  const recentlyUsed = useMemo(() => isRecentlyUsed(item), [isRecentlyUsed, item]);
  const isItemFavorite = useMemo(() => isFavorite(item), [isFavorite, item]);

  const copyAction = useMemo(() => {
    return (
      <Action.CopyToClipboard
        title="Copy Character to Clipboard"
        content={item.v}
        onCopy={() => addToRecentlyUsedItems(item)}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
    );
  }, [item, addToRecentlyUsedItems]);

  const pasteAction = useMemo(() => {
    return (
      <Action.Paste
        title={`Paste Character to ${frontmostApp?.name || "Active App"}`}
        content={item.v}
        icon={frontmostApp ? { fileIcon: frontmostApp.path } : Icon.Clipboard}
        onPaste={() => addToRecentlyUsedItems(item)}
        shortcut={{ modifiers: ["cmd"], key: "v" }}
      />
    );
  }, [frontmostApp, item, addToRecentlyUsedItems]);

  const main = useMemo(() => {
    if (primaryAction === "copy") {
      return (
        <>
          {copyAction}
          {pasteAction}
        </>
      );
    }
    return (
      <>
        {pasteAction}
        {copyAction}
      </>
    );
  }, [primaryAction, copyAction, pasteAction]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Main">{main}</ActionPanel.Section>
      <ActionPanel.Section title="Formats">
        <Action.CopyToClipboard
          title={`Copy "${formatting.hex}" (HEX) to Clipboard`}
          content={formatting.hex}
          onCopy={() => addToRecentlyUsedItems(item)}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
        />
        <Action.CopyToClipboard
          title={`Copy "${formatting.unicodeEscape}" (Unicode Escape) to Clipboard`}
          content={formatting.unicodeEscape}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
        />
        {html ? (
          <Action.CopyToClipboard
            title={`Copy "${html}" (HTML Entity) to Clipboard`}
            content={html}
            onCopy={() => addToRecentlyUsedItems(item)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
        ) : null}
        <Action.CopyToClipboard
          title={`Copy "${formatting.htmlDecimal}" (HTML Decimal) to Clipboard`}
          content={formatting.htmlDecimal}
          shortcut={{ modifiers: ["cmd", "shift"], key: html !== null ? "t" : "h" }}
        />
      </ActionPanel.Section>
      {section && (
        <ActionPanel.Section title="Filter">
          {filter !== section && (
            <Action
              title={`Set Filter to "${section}"`}
              icon={Icon.Filter}
              onAction={() => setDatasetFilterAnd(section)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
          {filter !== null && (
            <Action
              title={`Clear Filter (Show All Characters)`}
              icon={Icon.XMarkCircle}
              onAction={() => setDatasetFilterAnd(null)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Favorites">
        {isItemFavorite ? (
          <Action
            title="Remove from Favorites"
            icon={Icon.HeartDisabled}
            onAction={() => removeFromFavorites(item)}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        ) : (
          <Action
            title="Add to Favorites"
            icon={Icon.Heart}
            onAction={() => addToFavorites(item)}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        )}
        <Action
          title="Clear All Favorites"
          icon={Icon.Trash}
          onAction={() => clearFavorites()}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Recently Used">
        {recentlyUsed ? (
          <>
            <Action
              title="Remove from Recently Used"
              icon={Icon.Trash}
              onAction={() => removeFromRecentlyUsedItems(item)}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
            />
            <Action
              title="Clear All Recently Used"
              icon={Icon.Trash}
              onAction={() => clearRecentlyUsedItems()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            />
          </>
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Browser">
        <Action.OpenInBrowser
          title="Open Character on Compart"
          url={`https://www.compart.com/en/unicode/U+${formatting.hex}`}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.OpenInBrowser
          title="Open Character on Unicode Explorer"
          url={`https://unicode-explorer.com/c/${formatting.hex}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
