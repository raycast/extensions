import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";

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

type NoteItem = {
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
  locked: boolean;
  pinned: boolean;
  checklist: boolean;
  checklistInProgress: boolean;
};

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");

export async function getNotes(maxQueryResults: number, filterByTags: string[] = []) {
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
    LIMIT ${maxQueryResults}
  `;

  const data = await executeSQL<NoteItem>(NOTES_DB, query);

  if (!data || data.length === 0) {
    return { pinnedNotes: [], unpinnedNotes: [], deletedNotes: [], allNotes: [] };
  }

  let invitations: { invitationLink: string | null; noteId: string }[] = [];
  try {
    invitations = await executeSQL(
      NOTES_DB,
      `
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
    `,
    );
  } catch {
    // Silently fail if the table doesn't exist
  }

  const links = await executeSQL<Link>(
    NOTES_DB,
    `
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
  `,
  );

  // Get tags
  const tags = await executeSQL<Tag>(
    NOTES_DB,
    `
    SELECT
      note.z_pk AS notePk,
      link.zidentifier AS id,
      link.ZALTTEXT as text
    FROM
      ziccloudsyncingobject AS note
    JOIN ziccloudsyncingobject AS link ON note.z_pk = link.ZNOTE1
    WHERE
      link.ZTYPEUTI1 = 'com.apple.notes.inlinetextattachment.hashtag'
  `,
  );

  const alreadyFound: { [key: string]: boolean } = {};
  const notes = data
    .filter((x) => {
      const found = alreadyFound[x.id];
      if (!found) alreadyFound[x.id] = true;
      return !found;
    })
    .sort((a, b) => (a.modifiedAt && b.modifiedAt && a.modifiedAt < b.modifiedAt ? 1 : -1));

  let notesWithAdditionalFields = notes.map((note) => {
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
      url: getOpenNoteURL(note.UUID),
      invitationLink: noteInvitation?.invitationLink ?? null,
      links: noteLinks ?? [],
      backlinks: noteBacklinks ?? [],
      tags: noteTags ?? [],
    };
  });

  if (filterByTags.length) {
    notesWithAdditionalFields = notesWithAdditionalFields.filter((note) => {
      const noteTags = note.tags.map((t) => t.text);
      return filterByTags.every((tag) => noteTags.includes(`#${tag.replace("#", "")}`));
    });
  }

  return notesWithAdditionalFields;
}
