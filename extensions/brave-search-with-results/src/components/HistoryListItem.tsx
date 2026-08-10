import { Keyboard, List, ActionPanel, Action, Icon } from "@raycast/api";

import { HistoryItem } from "../hooks/useHistory";
import { Mode } from "../hooks/useMode";

interface HistoryItemProps {
  item: HistoryItem;
  addHistoryItem: (query: string) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  setQuery: (query: string) => void;
  setMode: (mode: Mode) => void;
}

export default function HistoryListItem({
  item,
  addHistoryItem,
  removeHistoryItem,
  clearHistory,
  setQuery,
  setMode,
}: HistoryItemProps) {
  return (
    <List.Item
      icon={Icon.MagnifyingGlass}
      title={item.query}
      subtitle={`Search for '${item.query}'`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              icon={Icon.MagnifyingGlass}
              title="Search"
              onAction={() => {
                addHistoryItem(item.query);
                setQuery(item.query);
                setMode(Mode.Search);
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title="Delete Entry"
              shortcut={Keyboard.Shortcut.Common.Remove}
              style={Action.Style.Destructive}
              onAction={() => {
                removeHistoryItem(item.id);
              }}
            />
            <Action
              icon={Icon.Trash}
              title="Delete All Entries"
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              style={Action.Style.Destructive}
              onAction={clearHistory}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
