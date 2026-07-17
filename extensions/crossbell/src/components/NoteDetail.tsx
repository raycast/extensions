import { Detail } from "@raycast/api";
import { useCallback } from "react";
import type { NoteEntity } from "crossbell";
import { useCharacter } from "../apis";
import { extractCharacterInfo } from "../utils/character";
import { extractNoteInfo } from "../utils/note";
import { composeCharacterUrl, composeNoteUrl } from "../utils/url";
import NoteActionPanel from "./NoteActionPanel";
import { useNote } from "../apis/note";

export default function NoteDetail({ note }: { note: NoteEntity }) {
  const { title, tags, sources, createdAt, updatedAt, publishedAt } = extractNoteInfo(note);

  const { data: character } = useCharacter(note.characterId);
  const { handle, username, avatar } = extractCharacterInfo(character);

  const { data: toNote } = useNote(note.toCharacterId, note.toNoteId);

  const composeNoteMarkdown = useCallback(
    (note: NoteEntity, toNote?: NoteEntity) => {
      const { title, attachments, content } = extractNoteInfo(note);

      let markdown = content;

      if (title) {
        markdown = `# ${title}\n\n` + markdown;
      }

      if (attachments.length > 0) {
        markdown += "\n\n## Attachments\n\n";

        for (const attachment of attachments) {
          markdown += `![${attachment.name}](${attachment.address})\n\n`;
        }
      }

      if (note.toCharacterId && note.toNoteId) {
        markdown =
          `_Replied to [${note.toCharacterId}-${note.toNoteId}](${composeNoteUrl(
            note.toCharacterId,
            note.toNoteId,
          )})_\n\n` + markdown;

        markdown += `\n\n---\n\n_Original note:_\n\n`;
        if (toNote) {
          markdown += composeNoteMarkdown(toNote);
        } else {
          markdown += "\n\nLoading...";
        }
      }

      return markdown;
    },
    [note, toNote],
  );

  return (
    <Detail
      markdown={composeNoteMarkdown(note, toNote)}
      navigationTitle={title ?? "Note"}
      metadata={
        <Detail.Metadata>
          {tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {sources.length > 0 && (
            <Detail.Metadata.TagList title="Sources">
              {sources.map((source) => (
                <Detail.Metadata.TagList.Item key={source} text={source} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Label title="Created At" text={createdAt} />
          {updatedAt !== createdAt && <Detail.Metadata.Label title="Updated At" text={updatedAt} />}
          {publishedAt && <Detail.Metadata.Label title="Published At" text={publishedAt} />}
          <Detail.Metadata.Link
            title="Note Page"
            target={composeNoteUrl(note.characterId, note.noteId)}
            text={`${note.characterId}-${note.noteId}`}
          />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Author Character" text={username ?? handle} icon={avatar} />
          <Detail.Metadata.Link title="Character Page" target={composeCharacterUrl(handle)} text={`@${handle}`} />
        </Detail.Metadata>
      }
      actions={<NoteActionPanel note={note} />}
    />
  );
}
