import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";

interface HeadersListViewProps {
  headers: Record<string, string>;
}

export function AllHeadersListView({ headers }: HeadersListViewProps) {
  const headerEntries = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));

  return (
    <List navigationTitle="HTTP Headers" searchBarPlaceholder="Filter headers...">
      <List.Section title="All Headers" subtitle={`${headerEntries.length}`}>
        {headerEntries.map(([key, value]) => (
          <List.Item
            key={key}
            title={key}
            icon={Icon.Document}
            accessories={[{ text: value }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Header Value"
                  content={value}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy Header Name"
                  content={key}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard title="Copy as Name: Value" content={`${key}: ${value}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {headerEntries.length === 0 && <List.EmptyView title="No headers found" icon={Icon.MagnifyingGlass} />}
    </List>
  );
}
