import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";
import { SlackClient } from "../../shared/client";
import { SLACK_EMOJI_CODE_MAP } from "../../constants/emoji.constants";

interface EmojiPickerProps {
  onSelect: (emoji: { name: string; value: string }) => void;
}

const DISPLAY_LIMIT = 1000;

function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [displayLimit, setDisplayLimit] = useState(DISPLAY_LIMIT);
  const { data: workspaceEmojis, isLoading } = useCachedPromise(SlackClient.getWorkspaceEmojis);

  const emojiEntries = useMemo(() => {
    const emojis = { ...workspaceEmojis, ...SLACK_EMOJI_CODE_MAP };
    return Object.entries(emojis).map(([name, value]) => ({
      name,
      value,
    }));
  }, [workspaceEmojis]);

  const filtered = useMemo(() => {
    const normalized = searchText.replace(/^:/, "").toLowerCase();
    if (!normalized) return emojiEntries;

    return emojiEntries.filter((emoji) => emoji.name.toLowerCase().includes(normalized));
  }, [searchText, emojiEntries]);

  const visibleEmojis = useMemo(() => filtered.slice(0, displayLimit), [filtered, displayLimit]);
  const hiddenCount = filtered.length - visibleEmojis.length;

  const handleSearchTextChange = useCallback((value: string) => {
    setSearchText(value);
    setDisplayLimit(DISPLAY_LIMIT);
  }, []);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder={"Search emoji (e.g. :smile)"}
      throttle
    >
      {visibleEmojis.map((emoji) => (
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
      {hiddenCount > 0 && (
        <List.Item
          title="Show More"
          subtitle={`${hiddenCount} more`}
          icon={Icon.Ellipsis}
          actions={
            <ActionPanel>
              <Action title="Show More" onAction={() => setDisplayLimit((limit) => limit + DISPLAY_LIMIT)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

EmojiPicker.displayName = "EmojiPicker";

export { EmojiPicker };
