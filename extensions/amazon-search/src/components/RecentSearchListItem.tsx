import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getSearchUrl } from "../search";

interface RecentSearchListItemProps {
  item: string;
  tld: string;
  onRemove: (item: string) => void;
  onClearHistory: () => void;
}

export const RecentSearchListItem = ({ item, tld, onRemove, onClearHistory }: RecentSearchListItemProps) => (
  <List.Item
    title={item}
    icon={Icon.MagnifyingGlass}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser url={getSearchUrl(item, tld)} />
        <Action
          title="Remove Search Item"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          style={Action.Style.Destructive}
          onAction={() => onRemove(item)}
        />
        <Action
          title="Clear Search History"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          style={Action.Style.Destructive}
          onAction={onClearHistory}
        />
      </ActionPanel>
    }
  />
);
