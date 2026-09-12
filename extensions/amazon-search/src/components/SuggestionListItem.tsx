import { Action, ActionPanel, Icon, List } from "@raycast/api";

interface SuggestionListItemProps {
  item: string;
  tld: string;
  onOpen: (text: string) => void;
}

export const SuggestionListItem = ({ item, tld, onOpen }: SuggestionListItemProps) => (
  <List.Item
    title={item}
    icon={Icon.MagnifyingGlass}
    actions={
      <ActionPanel>
        <Action.OpenInBrowser
          url={`https://www.amazon.${tld}/s?k=${encodeURIComponent(item)}`}
          onOpen={() => onOpen(item)}
        />
      </ActionPanel>
    }
  />
);
