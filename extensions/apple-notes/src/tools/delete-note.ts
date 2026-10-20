import { Action, Tool } from "@raycast/api";
import { executeSQL } from "@raycast/utils";

import { deleteNoteById } from "../api/applescript";
import { escapeSQLString, NOTES_DB, resolveAppleNoteId } from "../helpers";

type Input = {
  /** The note identifier. Use the "id" value from search-notes when possible. */
  noteId: string;
  /** The title of the note, used to display in the confirmation dialog. */
  noteTitle?: string;
};

type NoteTitleRow = {
  title: string | null;
};

function shortenNoteId(noteId: string) {
  if (noteId.length <= 48) {
    return noteId;
  }

  return `${noteId.slice(0, 30)}...${noteId.slice(-12)}`;
}

async function getNoteTitleByResolvedId(resolvedNoteId: string): Promise<string | undefined> {
  const escapedResolvedNoteId = escapeSQLString(resolvedNoteId);
  const rows = await executeSQL<NoteTitleRow>(
    NOTES_DB,
    `
      SELECT
        note.ztitle1 AS title
      FROM
        ziccloudsyncingobject AS note
      LEFT JOIN z_metadata AS zmd ON 1=1
      WHERE
        ('x-coredata://' || zmd.z_uuid || '/ICNote/p' || note.z_pk) = '${escapedResolvedNoteId}'
      LIMIT 1
    `,
  );

  const title = rows?.[0]?.title?.trim();
  return title || undefined;
}

export default async function (input: Input) {
  const noteId = await resolveAppleNoteId(input.noteId);
  return deleteNoteById(noteId);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Resolution failures must propagate: falling back to the raw input id here would let the
  // confirmation show an unresolved identifier while execution independently re-resolves and
  // deletes whatever note that resolves to.
  const resolvedNoteId = await resolveAppleNoteId(input.noteId);

  let resolvedTitle: string | undefined;
  try {
    resolvedTitle = await getNoteTitleByResolvedId(resolvedNoteId);
  } catch {
    // Fall back to ID-only confirmation when the title lookup fails.
  }

  const displayId = shortenNoteId(resolvedNoteId);

  return {
    style: Action.Style.Destructive,
    message: resolvedTitle
      ? `Are you sure you want to delete note "${resolvedTitle}" (ID: ${displayId})?`
      : `Are you sure you want to delete note ID "${displayId}"?`,
  };
};
