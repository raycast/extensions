import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { Emoji } from "../../types/emoji.type";
import { useMemo, useState } from "react";

interface EmojiPickerProps {
  emojis: Emoji;
  onSelect: (emoji: { name: string; value: string }) => void;
}

function EmojiPicker({ emojis, onSelect }: EmojiPickerProps) {
  const { pop } = useNavigation();

  const [searchText, setSearchText] = useState("");

  const emojiEntries = useMemo(() => {
    return Object.entries(emojis).map(([name, value]) => ({
      name,
      value,
    }));
  }, [emojis]);

  const filtered = useMemo(() => {
    const normalized = searchText.replace(/^:/, "").toLowerCase();
    if (!normalized) return emojiEntries;

    return emojiEntries.filter((emoji) => emoji.name.toLowerCase().includes(normalized));
  }, [searchText, emojiEntries]);

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder={"Search emoji (e.g. :smile)"} throttle>
      {filtered.map((emoji) => (
        <List.Item
          key={emoji.name}
          title={emoji.name}
          icon={emoji.value}
          actions={
            <ActionPanel>
              <Action
                title={"Select Emoji"}
                onAction={async () => {
                  onSelect(emoji);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

EmojiPicker.displayName = "EmojiPicker";

export { EmojiPicker };
