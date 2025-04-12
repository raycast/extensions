import { NoteEntry, xCallbackToOpenNoteByPath } from "./note-utilities";
import { useNote } from "./hooks";
import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";

export const OpenNoteAction = ({ entry }: { entry: NoteEntry }) => {
  return <Action.OpenInBrowser url={xCallbackToOpenNoteByPath(entry)} title={"Open in NotePlan"} icon={Icon.Window} />;
};

export const SaveAsQuicklinkAction = ({ entry }: { entry: NoteEntry }) => {
  return <Action.CreateQuicklink quicklink={{ link: xCallbackToOpenNoteByPath(entry) }} />;
};

export const ShowDetailsAction = ({ entry }: { entry: NoteEntry }) => {
  const { push } = useNavigation();
  return <Action title="Show Details" onAction={() => push(<NoteDetail entry={entry} />)} icon={Icon.Eye} />;
};

export const NoteDetail = ({ entry }: { entry: NoteEntry }) => {
  const [note] = useNote({ entry });

  return (
    <Detail
      markdown={note?.content}
      actions={
        <ActionPanel>
          <OpenNoteAction entry={entry} />
          <SaveAsQuicklinkAction entry={entry} />
        </ActionPanel>
      }
    />
  );
};
