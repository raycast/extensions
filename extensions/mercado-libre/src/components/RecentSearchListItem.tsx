import { Action, ActionPanel, Icon, List } from "@raycast/api";

interface RecentSearchListItemProps {
  query: string;
  index: number;
  handleSearchSelect: (query: string) => void;
  handleRemoveSearchItem: (query: string) => void;
  handleClearSearchHistory: () => Promise<void>;
}

export const RecentSearchListItem = ({
  query,
  index,
  handleSearchSelect,
  handleRemoveSearchItem,
  handleClearSearchHistory,
}: RecentSearchListItemProps) => (
  <List.Item
    key={index}
    title={query}
    icon={Icon.MagnifyingGlass}
    actions={
      <ActionPanel>
        <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => handleSearchSelect(query)} />
        <Action
          title="Remove Search Item"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          style={Action.Style.Destructive}
          onAction={() => handleRemoveSearchItem(query)}
        />
        <Action
          title="Clear Search History"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          style={Action.Style.Destructive}
          onAction={handleClearSearchHistory}
        />
      </ActionPanel>
    }
  />
);
