import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { Note } from "../hooks";

export function NoteDetails({ note, noteUrl }: { note: Note; noteUrl: string }) {
  const { pop } = useNavigation();

  return (
    <Detail
      navigationTitle={`Note: ${note.title}`}
      markdown={note.content}
      actions={
        <ActionPanel title={`Note: ${note.title}`}>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Edit in Browser" url={noteUrl} icon={Icon.Pencil} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action icon={Icon.ArrowLeft} title="Go Back" onAction={pop} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
