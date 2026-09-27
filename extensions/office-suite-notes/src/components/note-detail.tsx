import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readNote } from "../lib/api";
import { preview } from "../lib/content";
import { NoteForm } from "./note-form";
import { SettingsAction } from "./settings-action";

export function NoteDetail({ id }: { id: string }) {
  const { data, isLoading, error, revalidate } = usePromise(readNote, [id]);
  const note = data?.data;
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={note?.title ?? "Read Note"}
      markdown={
        error ? `## Unable to Read Note\n\n${error.message}` : note ? preview(note.content ?? "") || "*Empty note*" : ""
      }
      metadata={
        note && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={note.title} />
            <Detail.Metadata.Label title="ID" text={note.id} />
            <Detail.Metadata.Label title="Folder" text={note.folder || "—"} />
            <Detail.Metadata.Label title="Updated" text={note.updated ?? "—"} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {note && (
            <>
              <Action.CopyToClipboard title="Copy Content" content={note.content ?? ""} />
              <Action.Push
                title="Append Content"
                icon={Icon.Plus}
                target={<NoteForm note={note} onSaved={revalidate} />}
              />
              <Action.CopyToClipboard title="Copy Note ID" content={note.id} />
            </>
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <SettingsAction />
        </ActionPanel>
      }
    />
  );
}
