/* eslint-disable @raycast/prefer-title-case */
import { useMemo } from "react";

import { Action, ActionPanel, Icon } from "@raycast/api";

import { useListContext } from "@/context/ListContext";
import type { Character } from "@/types";
import { numberToHex } from "@/utils/string";

export const CharacterActionPanel = ({ item }: { item: Character }) => {
  const { findHtmlEntity } = useListContext();
  const html = findHtmlEntity(item.c);

  const { addToRecentlyUsedItems, isRecentlyUsed, clearRecentlyUsedItems, removeFromRecentlyUsedItems } =
    useListContext();
  const recentlyUsed = useMemo(() => isRecentlyUsed(item), [isRecentlyUsed, item]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Unicode">
        <Action.Paste
          title="Paste Character in Active App"
          content={item.v}
          onPaste={() => addToRecentlyUsedItems(item)}
        />
        <Action.CopyToClipboard
          title="Copy Character to Clipboard"
          content={item.v}
          onCopy={() => addToRecentlyUsedItems(item)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Misc">
        <Action.CopyToClipboard
          title={`Copy "${numberToHex(item.c)}" (HEX) to Clipboard`}
          content={numberToHex(item.c)}
          onCopy={() => addToRecentlyUsedItems(item)}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
        />
        {html ? (
          <Action.CopyToClipboard
            title={`Copy "${html}" (HTML) to Clipboard`}
            content={html}
            onCopy={() => addToRecentlyUsedItems(item)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
        ) : null}
        <Action.CopyToClipboard
          title={`Copy "&#${item.c};" (HTML) to Clipboard`}
          content={`&#${item.c};`}
          onCopy={() => addToRecentlyUsedItems(item)}
          shortcut={{ modifiers: ["cmd", "shift"], key: html !== null ? "t" : "h" }}
        />
        {recentlyUsed ? (
          <>
            <Action
              title="Remove from Recently Used"
              icon={Icon.Trash}
              onAction={() => removeFromRecentlyUsedItems(item)}
            />
            <Action title="Remove All from Recently Used" icon={Icon.Trash} onAction={() => clearRecentlyUsedItems()} />
          </>
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Browser">
        <Action.OpenInBrowser
          title="Open Character on Compart"
          url={`https://www.compart.com/en/unicode/U+${numberToHex(item.c)}`}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
