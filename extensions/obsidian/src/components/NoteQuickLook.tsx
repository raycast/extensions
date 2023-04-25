import { Detail } from "@raycast/api";
import { Note } from "../utils/interfaces";
import { filterContent } from "../utils/utils";

export function NoteQuickLook(props: { showTitle: boolean; note: Note }) {
  const { note, showTitle } = props;

  const title = note.starred ? `⭐️ ${note.title}` : note.title;

  return (
    <Detail
      isLoading={note === undefined}
      navigationTitle={showTitle ? title : ""}
      markdown={filterContent(note.content)}
    />
  );
}
