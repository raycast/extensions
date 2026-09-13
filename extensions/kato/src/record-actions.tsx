import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { CreateCommentForm } from "./create-comment";
import { CreateTaskForm } from "./create-task";
import type { RecordSearchResult } from "./types";

export function RecordActions({ record }: { record: RecordSearchResult }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open in Kato" url={record.webUrl} />
        <Action.Push
          title="Create Linked Task"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={
            <CreateTaskForm
              context={{
                recordId: record.id,
                label: record.title,
                suggestedTitle: `Follow up: ${record.title}`,
              }}
            />
          }
        />
        <Action.Push
          title="Comment on Record"
          icon={Icon.Message}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          target={
            <CreateCommentForm
              context={{
                entityType: "record",
                entityId: record.id,
                label: record.title,
              }}
            />
          }
        />
      </ActionPanel.Section>
      {record.record.meta.length ? (
        <ActionPanel.Submenu title="Record Fields" icon={Icon.List}>
          {record.record.meta.map((field) => {
            const target =
              field.type === "email"
                ? `mailto:${field.value}`
                : field.type === "phone"
                  ? `tel:${field.value}`
                  : field.type === "url" || /^https?:\/\//i.test(field.value)
                    ? field.value
                    : field.type === "location"
                      ? `https://maps.apple.com/?q=${encodeURIComponent(field.value)}`
                      : null;
            return target ? (
              <Action.OpenInBrowser
                key={`${field.label}-${field.value}`}
                title={`Open ${field.label}`}
                url={target}
              />
            ) : (
              <Action.CopyToClipboard
                key={`${field.label}-${field.value}`}
                title={`Copy ${field.label}`}
                content={field.value}
              />
            );
          })}
        </ActionPanel.Submenu>
      ) : null}
      <Action.CopyToClipboard title="Copy Kato Link" content={record.webUrl} />
    </ActionPanel>
  );
}
