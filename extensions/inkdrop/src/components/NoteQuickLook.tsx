import { ActionPanel, Detail, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import type { Book, Note, Tag } from "../inkdrop";
import { truncateBody } from "../utils";
import { NoteActions } from "./NoteActions";

const MAX_QUICKLOOK_CHARS = 40000;

export const NoteQuickLook = ({
  note,
  books,
  tags,
  resolveImages,
  onDelete,
}: {
  note: Note;
  books: Book[] | undefined;
  tags: Tag[] | undefined;
  resolveImages: (body: string) => Promise<string>;
  onDelete?: (noteId: string) => Promise<void>;
}) => {
  const { pop } = useNavigation();
  const isTruncated = note.body.length > MAX_QUICKLOOK_CHARS;
  const body = isTruncated
    ? `${truncateBody(note.body, MAX_QUICKLOOK_CHARS)}\n\n*This note has been truncated. Open in Inkdrop to view the full content.*`
    : note.body;

  const [markdown, setMarkdown] = useState(body);

  useEffect(() => {
    let cancelled = false;
    resolveImages(body).then((resolved) => {
      if (!cancelled) setMarkdown(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [note._id]);

  const handleDelete = useCallback(
    async (noteId: string) => {
      if (onDelete) {
        await onDelete(noteId);
        pop();
      }
    },
    [onDelete, pop],
  );

  return (
    <Detail
      navigationTitle={note.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <NoteActions
            note={note}
            books={books}
            tags={tags}
            showQuickLook={false}
            onDelete={onDelete ? handleDelete : undefined}
          />
        </ActionPanel>
      }
    />
  );
};
