import { ActionPanel, Action, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { GoogleDoc } from "../google_fns";
import { getOriginalNoteName } from "../util";

function NoteListItemActions(props: { file: GoogleDoc }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={"https://docs.google.com/document/d/" + props.file.id} />
      <Action.CopyToClipboard title="Copy URL" content={props.file.name} />
    </ActionPanel>
  );
}

export function ListNotes() {
  const [myNotes] = useCachedState<Array<GoogleDoc>>("raycast-notes-files", []);

  return (
    <List>
      {myNotes?.map((file) => (
        <List.Item
          key={file.id}
          title={getOriginalNoteName(file.name)}
          actions={<NoteListItemActions file={file} />}
          accessories={[{ text: `Last modified: ${file.modifiedTime}` }]}
        />
      ))}
    </List>
  );
}
