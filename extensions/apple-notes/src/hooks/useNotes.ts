import { homedir } from "os";
import { resolve } from "path";

import { useSQL } from "@raycast/utils";
import { partition } from "lodash";

import { getOpenNoteURL } from "../helpers";

type Link = {
  id: string;
  text: string | null;
  url: string | null;
  notePk: number;
};

type Backlink = {
  id: string;
  title: string;
  url: string;
};

type Tag = {
  id: string;
  text: string | null;
  notePk: number;
};

export type NoteItem = {
  id: string;
  pk: number;
  UUID: string;
  title: string;
  modifiedAt?: Date;
  folder: string;
  snippet: string;
  account: string;
  invitationLink: string | null;
  links: Link[];
  backlinks: Backlink[];
  tags: Tag[];
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
        note.z_pk AS pk,
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

const linksQuery = `
    SELECT
      note.z_pk AS notePk,
      link.zidentifier AS id,
      link.ZALTTEXT as text,
      link.ZTOKENCONTENTIDENTIFIER as url
    FROM
      ziccloudsyncingobject AS note
    JOIN ziccloudsyncingobject AS link ON note.z_pk = link.ZNOTE1
    WHERE
      link.ZTYPEUTI1 = 'com.apple.notes.inlinetextattachment.link'
`;

const tagsQuery = `
    SELECT
      note.z_pk AS notePk,
      link.zidentifier AS id,
      link.ZALTTEXT as text
    FROM
      ziccloudsyncingobject AS note
    JOIN ziccloudsyncingobject AS link ON note.z_pk = link.ZNOTE1
    WHERE
      link.ZTYPEUTI1 = 'com.apple.notes.inlinetextattachment.hashtag'
`;

export const useNotes = () => {
  const { data, ...rest } = useSQL<NoteItem>(NOTES_DB, query, {
    permissionPriming: "This is required to search your Apple Notes.",
  });

  // Split the query into two to avoid a SQL error if the zcinivitation table doesn't exist
  const { data: invitations } = useSQL<{ invitationLink: string | null; noteId: string }>(NOTES_DB, invitationQuery, {
    execute: data && data.length > 0,
    onError() {
      // Silently fail if the table doesn't exist
    },
  });

  const { data: links } = useSQL<Link>(NOTES_DB, linksQuery, {
    execute: data && data.length > 0,
  });

  const { data: tags } = useSQL<Tag>(NOTES_DB, tagsQuery, {
    execute: data && data.length > 0,
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

  const notesWithAdditionalFields = notes.map((note) => {
    const noteInvitation = invitations?.find((inv) => inv.noteId === note.id);
    const noteLinks = links?.filter((link) => link.notePk == note.pk);

    const noteBacklinks: Backlink[] = [];
    links?.forEach((link) => {
      if (link.url?.includes(note.UUID.toLowerCase())) {
        const originalNote = notes.find((n) => n.pk === link.notePk);
        if (!originalNote) return;

        noteBacklinks.push({
          id: link.id,
          title: originalNote.title,
          url: getOpenNoteURL(originalNote.UUID),
        });
      }
    });

    const noteTags = tags?.filter((tag) => tag.notePk == note.pk);

    return {
      ...note,
      invitationLink: noteInvitation?.invitationLink ?? null,
      links: noteLinks ?? [],
      backlinks: noteBacklinks ?? [],
      tags: noteTags ?? [],
    };
  });

  const [activeNotes, deletedNotes] = partition(notesWithAdditionalFields, (note) => note.folder != "Recently Deleted");
  const [pinnedNotes, unpinnedNotes] = partition(activeNotes, (note) => note.pinned);

  return {
    data: { pinnedNotes, unpinnedNotes, deletedNotes, allNotes: [...pinnedNotes, ...unpinnedNotes, ...deletedNotes] },
    ...rest,
  };
};
