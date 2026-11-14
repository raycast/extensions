import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import type { ReactNode } from "react";
import { formatDuration, type Entry } from "daily-karte";
import { activityIcon } from "./components";
import { markdownText } from "./lib/presentation";
import { EditEntry } from "./entry-form";

export function EntryItem({
  entry,
  uid,
  projectId,
  onSaved,
  sharedActions,
}: {
  entry: Entry;
  uid: string;
  projectId: string;
  onSaved: () => void;
  sharedActions: ReactNode;
}) {
  return (
    <List.Item
      id={entry.id}
      title={entry.name}
      icon={activityIcon(entry)}
      keywords={entry.note ? [entry.note] : []}
      accessories={[
        {
          text: new Date(entry.end).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={`# ${markdownText(entry.name)}\n\n${entry.note ? markdownText(entry.note) : "This activity has no note."}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Estimated Duration" text={formatDuration(entry.duration)} />
              <List.Item.Detail.Metadata.Label
                title="Started At"
                text={entry.start === null ? "No start estimate" : new Date(entry.start).toLocaleString()}
              />
              <List.Item.Detail.Metadata.Label title="Ended At" text={new Date(entry.end).toLocaleString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Record"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<EditEntry id={entry.id} uid={uid} projectId={projectId} onSaved={onSaved} />}
          />
          {sharedActions}
        </ActionPanel>
      }
    />
  );
}
