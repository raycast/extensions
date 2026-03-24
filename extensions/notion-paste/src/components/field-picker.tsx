import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { NotionRecord } from "../types";

interface FieldPickerProps {
  record: NotionRecord;
}

/**
 * Second-level view that lists the configured picker properties for a selected
 * Notion record. The primary action pastes the field value into the frontmost
 * app and copies it to the clipboard. The secondary action copies only.
 */
export function FieldPicker({ record }: FieldPickerProps) {
  return (
    <List
      navigationTitle={`Fields — ${record.title}`}
      searchBarPlaceholder="Filter fields…"
    >
      {record.pickerProperties.length === 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="No picker fields configured"
          description="Check the 'Picker Properties' setting in the command preferences."
        />
      ) : (
        record.pickerProperties.map((prop) => (
          <List.Item
            key={prop.name}
            icon={Icon.TextInput}
            title={prop.name}
            subtitle={prop.value || "(empty)"}
            accessories={[
              {
                text: prop.value
                  ? prop.value.length > 60
                    ? prop.value.slice(0, 57) + "…"
                    : prop.value
                  : "",
                tooltip: prop.value,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Paste
                  title="Paste into Active App"
                  icon={Icon.Clipboard}
                  content={prop.value}
                />
                <Action.CopyToClipboard
                  title="Copy to Clipboard Only"
                  icon={Icon.CopyClipboard}
                  content={prop.value}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open Record in Notion"
                  icon={Icon.Globe}
                  url={record.url}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
