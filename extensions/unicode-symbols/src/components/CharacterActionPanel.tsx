import { useMemo } from "react";

import { Action, ActionPanel, Icon } from "@raycast/api";

import { useListContext } from "@/context/ListContext";
import type { Character } from "@/lib/dataset-manager";
import { numberToHex } from "@/utils/string";

export const CharacterActionPanel = ({ item }: { item: Character }) => {
  const { addToRecentlyUsedItems, isRecentlyUsed, clearRecentlyUsedItems, removeFromRecentlyUsedItems } =
    useListContext();
  const recentlyUsed = useMemo(() => isRecentlyUsed(item), [isRecentlyUsed, item]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Unicode">
        <Action.Paste
          title="Paste Character in Active App"
          content={item.value}
          onPaste={() => addToRecentlyUsedItems(item)}
        />
        <Action.CopyToClipboard
          title="Copy Character to Clipboard"
          content={item.value}
          onCopy={() => addToRecentlyUsedItems(item)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Misc">
        <Action.CopyToClipboard
          title={`Copy "${numberToHex(item.code)}" (HEX) to Clipboard`}
          content={numberToHex(item.code)}
          onCopy={() => addToRecentlyUsedItems(item)}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
        />
        <Action.CopyToClipboard
          title={`Copy "&#${item.code};" (HTML) to Clipboard`}
          content={`&#${item.code};`}
          onCopy={() => addToRecentlyUsedItems(item)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        />
        {recentlyUsed ? (
          <>
            <Action
              title="Remove From Recently Used"
              icon={Icon.Trash}
              onAction={() => removeFromRecentlyUsedItems(item)}
            />
            <Action title="Remove All From Recently Used" icon={Icon.Trash} onAction={() => clearRecentlyUsedItems()} />
          </>
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
};
