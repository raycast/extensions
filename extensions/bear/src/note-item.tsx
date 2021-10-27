import { List } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { Note } from "./bear-db";
import NoteActions from "./note-actions";

/**
 * Get a nicely formatted string of tags from an array of tags
 *
 * @param tagStr - A `SqlVallue` containing the string of comma seperated tags
 * @returns
 */
function formatTags(tags: string[]): string {
  if (tags.length === 0) {
    return "Not Tagged";
  }
  const formattedTags = [];
  for (const tag of tags) {
    // Only format tag if tah is not subtag
    if (tags.filter((t) => t.includes(tag)).length < 2) {
      // Format tags with spaces like Bear (two hashtags)
      formattedTags.push(tag.includes(" ") ? `#${tag}#` : `#${tag}`);
    }
  }
  return formattedTags.join(" ");
}

export default function NoteItem({ note }: { note: Note }) {
  return (
    <List.Item
      key={note.id}
      title={note.title === "" ? "Untitled Note" : note.title}
      subtitle={formatTags(note.tags)}
      icon={{ source: "command-icon.png" }}
      keywords={[note.id]}
      actions={<NoteActions isNotePreview={false} note={note} />}
      accessoryTitle={`edited ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}`}
    />
  );
}
