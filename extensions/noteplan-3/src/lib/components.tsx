import { NoteEntry } from "./note-utilities";
import { useNote } from "./hooks";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

export const OpenNoteAction = ({ entry }: { entry: NoteEntry }) => {
  const xCallbackUrl = `noteplan://x-callback-url/openNote?noteTitle=${encodeURIComponent(entry.fileName)}`;
  return <Action.OpenInBrowser url={xCallbackUrl} title={"Open in NotePlan"} icon={Icon.Window} />;
};

export const NoteDetail = ({ entry }: { entry: NoteEntry }) => {
  const [note] = useNote({ entry });

  return (
    <Detail
      markdown={note?.content}
      actions={
        <ActionPanel>
          <OpenNoteAction entry={entry} />
        </ActionPanel>
      }
    />
  );
};
