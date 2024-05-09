import { homedir } from "os";
import { resolve } from "path";

import { showFailureToast, useSQL } from "@raycast/utils";
import { partition } from "lodash";

export type NoteItem = {
  id: string;
  UUID: string;
  title: string;
  modifiedAt?: Date;
  folder: string;
  snippet: string;
  account: string;
  invitationLink: string | null;
  // the booleans below are stored as 0 or 1 in the database
  locked: boolean;
  pinned: boolean;
  checklist: boolean;
  checklistInProgress: boolean;
};

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");

const query = `
    SELECT
        'x-coredata://' || zmd.z_uuid || '/ICNote/p' || note.z_pk AS id,
        note.ztitle1 AS title,
        folder.ztitle2 AS folder,
        datetime(note.zmodificationdate1 + 978307200, 'unixepoch') AS modifiedAt,
        note.zsnippet AS snippet,
        acc.zname AS account,
        note.zidentifier AS UUID,
        (note.zispasswordprotected = 1) as locked,
        (note.zispinned = 1) as pinned,
        (note.zhaschecklist = 1) as checklist,
        (note.zhaschecklistinprogress = 1) as checklistInProgress
    FROM 
        ziccloudsyncingobject AS note
    INNER JOIN ziccloudsyncingobject AS folder 
        ON note.zfolder = folder.z_pk
    LEFT JOIN ziccloudsyncingobject AS acc 
        ON note.zaccount4 = acc.z_pk
    LEFT JOIN z_metadata AS zmd ON 1=1
    WHERE
        note.ztitle1 IS NOT NULL AND
        note.zmodificationdate1 IS NOT NULL AND
        note.z_pk IS NOT NULL AND
        note.zmarkedfordeletion != 1 AND
        folder.zmarkedfordeletion != 1
    ORDER BY
        note.zmodificationdate1 DESC
`;

const invitationQuery = `
    SELECT
        inv.zshareurl AS invitationLink,
        'x-coredata://' || zmd.z_uuid || '/ICNote/p' || note.z_pk AS noteId
    FROM
        ziccloudsyncingobject AS note
    LEFT JOIN zicinvitation AS inv 
        ON note.zinvitation = inv.z_pk
    LEFT JOIN z_metadata AS zmd ON 1=1
    WHERE
        note.zmarkedfordeletion != 1
`;

export const useNotes = () => {
  const { data, ...rest } = useSQL<NoteItem>(NOTES_DB, query, {
    permissionPriming: "This is required to search your Apple Notes.",
  });

  // Split the query into two to avoid a SQL error if the zcinivitation table doesn't exist
  const { data: invitations } = useSQL<{ invitationLink: string | null; noteId: string }>(NOTES_DB, invitationQuery, {
    execute: data && data.length > 0,
    onError(error) {
      showFailureToast(error, { title: "Couldn't get invitations for notes" });
    },
  });

  const alreadyFound: { [key: string]: boolean } = {};
  const notes =
    data
      ?.filter((x) => {
        const found = alreadyFound[x.id];
        if (!found) alreadyFound[x.id] = true;
        return !found;
      })
      .sort((a, b) => (a.modifiedAt && b.modifiedAt && a.modifiedAt < b.modifiedAt ? 1 : -1)) ?? [];

  const notesWithInvitations = notes.map((note) => {
    const invitation = invitations?.find((inv) => inv.noteId === note.id);
    return {
      ...note,
      invitationLink: invitation?.invitationLink ?? null,
    };
  });

  const [activeNotes, deletedNotes] = partition(notesWithInvitations, (note) => note.folder != "Recently Deleted");
  const [pinnedNotes, unpinnedNotes] = partition(activeNotes, (note) => note.pinned);

  return {
    data: { pinnedNotes, unpinnedNotes, deletedNotes },
    ...rest,
  };
};
