import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { getOnixsUrl } from "./utils";

export interface TagItem {
  tag: number;
  name: string;
  type?: string;
  enums?: Record<string, string>;
}

export function TagDetail({ tag, version }: { tag: TagItem; version: string }) {
  const enumEntries = tag.enums ? Object.entries(tag.enums) : [];

  return (
    <List navigationTitle={`${tag.name} (Tag ${tag.tag}) - ${version}`}>
      <List.Section title="Tag Details">
        <List.Item
          title="Tag Number"
          subtitle={String(tag.tag)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in OnixS Dictionary"
                url={getOnixsUrl(version, tag.tag)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
              <Action.CopyToClipboard content={String(tag.tag)} title="Copy Tag Number" />
            </ActionPanel>
          }
        />
        <List.Item
          title="Tag Name"
          subtitle={tag.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in OnixS Dictionary"
                url={getOnixsUrl(version, tag.tag)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
              <Action.CopyToClipboard content={tag.name} title="Copy Tag Name" />
            </ActionPanel>
          }
        />
        {tag.type && (
          <List.Item
            title="Type"
            subtitle={tag.type}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={tag.type} title="Copy Type" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {enumEntries.length > 0 && (
        <List.Section title={`Valid Values (${enumEntries.length})`}>
          {enumEntries.map(([value, description]) => (
            <List.Item
              key={value}
              title={description}
              subtitle={value}
              icon={Icon.Tag}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={value} title="Copy Value" />
                  <Action.CopyToClipboard content={description} title="Copy Description" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
