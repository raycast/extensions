import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface NoTranslationsFoundProps {
  searchText: string;
  onSync: () => void;
}

export function NoTranslationsFound({ searchText, onSync }: NoTranslationsFoundProps) {
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title={searchText ? "No translations found" : "No translations"}
      description={searchText ? "Try a different search term" : "Sync translations to get started"}
      actions={
        <ActionPanel>
          <Action
            title="Sync Now"
            icon={Icon.ArrowClockwise}
            onAction={onSync}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
