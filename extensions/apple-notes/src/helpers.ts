import os from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";

export const fileIcon = "/System/Applications/Notes.app";
export const NOTES_DB = resolve(os.homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");

type ResolvedNoteId = {
  id: string;
};

export function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

export function escapeSQLString(value: string) {
  return value.replace(/'/g, "''");
}

export function truncate(str: string, maxLength = 30): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + "…";
}

export function getOpenNoteURL(uuid: string) {
  const isSonomaOrLater = parseInt(os.release().split(".")[0]) >= 23;
  return `${isSonomaOrLater ? "applenotes" : "notes"}://showNote?identifier=${uuid}`;
}

export async function resolveAppleNoteId(noteId: string): Promise<string> {
  if (noteId.startsWith("x-coredata://")) {
    return noteId;
  }

  const escapedNoteId = escapeSQLString(noteId);
  const rows = await executeSQL<ResolvedNoteId>(
    NOTES_DB,
    `
      SELECT
        'x-coredata://' || zmd.z_uuid || '/ICNote/p' || note.z_pk AS id
      FROM
        ziccloudsyncingobject AS note
      LEFT JOIN z_metadata AS zmd ON 1=1
      WHERE
        note.zidentifier = '${escapedNoteId}'
      LIMIT 1
    `,
  );

  return rows?.[0]?.id ?? noteId;
}
