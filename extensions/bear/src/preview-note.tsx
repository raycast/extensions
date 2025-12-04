import { Detail } from "@raycast/api";
import { homedir } from "os";
import { Note } from "./bear-db";
import NoteActions from "./note-actions";

const BEAR_LOCAL_FILES_PATH =
  homedir() + "/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/Local Files";

export function formatBearAttachments(text: string | null, forPreview = true): string {
  if (text === null) {
    return "";
  }
  let result = text;
  const matches = result.matchAll(/\[(?<type>file|image):(?<path>.+)\]/g);
  for (const match of matches) {
    if (match.groups === undefined) {
      return result;
    }
    let matchReplacement = "";
    if (match.groups.type === "image" && !forPreview) {
      const imagePath = `${BEAR_LOCAL_FILES_PATH}/Note Images/${match.groups.path}`;
      matchReplacement = `![](${imagePath})`;
    } else {
      const fileLink = encodeURI(
        `file://${BEAR_LOCAL_FILES_PATH}/${match.groups.type === "file" ? "Note Files" : "Note Images"}/${
          match.groups.path
        }`,
      );
      matchReplacement = `[Show attached ${match.groups.type}](${fileLink})`;
    }
    result = result.replace(match[0], matchReplacement);
  }
  return result;
}

export default function PreviewNote({ note }: { note: Note }) {
  const noteContent = note.encrypted ? `# ${note.title}\n\n*This note's content is encrypted*` : note.text;
  return (
    <Detail
      markdown={formatBearAttachments(noteContent)}
      navigationTitle={note.title}
      actions={<NoteActions isNotePreview={true} note={note} />}
    />
  );
}
