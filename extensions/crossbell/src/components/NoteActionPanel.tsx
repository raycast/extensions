import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import type { NoteEntity } from "crossbell";
import { composeNoteUrl } from "../utils/url";
import CharacterDetail from "./CharacterDetail";
import IpfsDetail from "./IpfsDetail";
import NoteDetail from "./NoteDetail";

export default function NoteActionPanel({
  note,
  enableShowDetail = false,
}: {
  note: NoteEntity;
  enableShowDetail?: boolean;
}) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {enableShowDetail && (
          <Action title="Show Detail" onAction={() => push(<NoteDetail note={note} />)} icon={Icon.Document} />
        )}
        {note.metadata?.uri && (
          <Action
            title="Show IPFS Metadata"
            onAction={() => push(<IpfsDetail ipfsLink={note.metadata?.uri} />)}
            icon={Icon.Document}
          />
        )}
        <Action.OpenInBrowser title="Open in Browser" url={composeNoteUrl(note.characterId, note.noteId)} />
        <Action.CopyToClipboard
          title="Copy Note Id"
          content={`${note.characterId}-${note.noteId}`}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Show Character Detail"
          onAction={() => push(<CharacterDetail characterId={note.characterId} />)}
          icon={Icon.Person}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
