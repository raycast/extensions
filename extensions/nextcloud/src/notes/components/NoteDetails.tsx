import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { getPreferences } from "../../preferences";
import { Note } from "../hooks";

export function NoteDetails({ note }: { note: Note }) {
  const { pop } = useNavigation();
  const { hostname } = getPreferences();

  const noteUrl = `https://${hostname}/apps/notes/note/${note.id}`;

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
            <Action title="Go Back" onAction={pop} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
