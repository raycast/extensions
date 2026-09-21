import { showFailureToast, useSQL } from "@raycast/utils";

import { Note, NOTES_DB } from "./notes-db";

type NoteRow = Omit<Note, "folderKey">;

const notesQuery = `
  SELECT
    'x-coredata://' || zmd.z_uuid || '/ICNote/p' || note.z_pk AS id,
    COALESCE(note.ztitle1, '') AS title,
    COALESCE(note.zsnippet, '') AS snippet,
    COALESCE(folder.ztitle2, '') AS folder,
    COALESCE(account.zname, '') AS account,
    note.zidentifier AS uuid
  FROM ziccloudsyncingobject AS note
  INNER JOIN ziccloudsyncingobject AS folder ON note.zfolder = folder.z_pk
  LEFT JOIN ziccloudsyncingobject AS account ON note.zaccount4 = account.z_pk
  LEFT JOIN z_metadata AS zmd ON 1 = 1
  WHERE note.ztitle1 IS NOT NULL
    AND note.zmarkedfordeletion != 1
    AND folder.zmarkedfordeletion != 1
  ORDER BY note.zmodificationdate1 DESC
`;

export function useNotes() {
  const notesState = useSQL<NoteRow>(NOTES_DB, notesQuery, {
    permissionPriming:
      "Apple Notes Paste needs Full Disk Access to search your Apple Notes. Your notes stay on this Mac.",
    onError(error) {
      showFailureToast(error, { title: "Could not read Apple Notes" });
    },
  });
  const notes = (notesState.data ?? [])
    .filter((note) => note.folder !== "Recently Deleted")
    .map((note) => ({ ...note, folderKey: `${note.account}|${note.folder}` }));
  const folders = Array.from(
    new Map(
      notes.map((note) => [note.folderKey, { key: note.folderKey, name: note.folder, account: note.account }]),
    ).values(),
  ).sort((first, second) => first.name.localeCompare(second.name));

  return {
    notes,
    folders,
    isLoading: notesState.isLoading,
    permissionView: notesState.permissionView,
    reload: notesState.revalidate,
  };
}
