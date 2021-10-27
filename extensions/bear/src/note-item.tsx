import { ActionPanel, Icon, List, OpenAction, PushAction } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { Note } from "./bear-db";
import NoteLinks from "./note-links";
import PreviewNote from "./preview-note";

export default function NoteItem({ note }: { note: Note }) {
  return (
    <List.Item
      key={note.id}
      title={note.title}
      subtitle={note.tags.map((t) => `#${t}`).join(" ")}
      icon={{ source: "command-icon.png" }}
      keywords={[note.id]}
      actions={
        <ActionPanel>
          <OpenAction title="Open Note in Bear" target={`bear://x-callback-url/open-note?id=${note.id}`} />
          <PushAction title="Show Note Preview" target={<PreviewNote note={note} />} />
          <PushAction
            title="Show Note Links"
            target={<NoteLinks note={note} />}
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
      accessoryTitle={`edited ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}`}
    />
  );
}
