import { executeSQL } from "@raycast/utils";

import { escapeSQLString, getOpenNoteURL, NOTES_DB, Link, Backlink, Tag, NoteItem } from "../helpers";

// SQLite's LOWER()/LIKE only fold ASCII case and never strip accents, so "cafe" wouldn't match
// "Café" in SQL. This is the authoritative, fully Unicode-aware check applied in JS; the SQL-side
// filter below only folds the common Latin accents, as a bound on how much data JS has to look at.
function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Common Latin accented characters mapped to their base letter, used to build a SQL expression
// that approximates normalizeForSearch well enough to prefilter and bound the query in SQL.
const SQL_DIACRITIC_REPLACEMENTS: [string, string][] = [
  ["àáâãäå", "a"],
  ["èéêë", "e"],
  ["ìíîï", "i"],
  ["òóôõö", "o"],
  ["ùúûü", "u"],
  ["ýÿ", "y"],
  ["ñ", "n"],
  ["ç", "c"],
];

function foldSqlColumn(column: string): string {
  const withDiacriticsFolded = SQL_DIACRITIC_REPLACEMENTS.reduce((expr, [accentedChars, base]) => {
    return [...accentedChars, ...accentedChars.toUpperCase()].reduce(
      (inner, accentedChar) => `REPLACE(${inner}, '${accentedChar}', '${base}')`,
      expr,
    );
  }, column);
  return `LOWER(${withDiacriticsFolded})`;
}

export async function getNotes(
  maxQueryResults: number,
  filterByTags: string[] = [],
  searchText?: string,
  exactTitleMatch = false,
) {
  const trimmedSearchText = searchText?.trim();
  const foldedSearchText = trimmedSearchText ? escapeSQLString(normalizeForSearch(trimmedSearchText)) : "";
  // SQLite's LOWER() only folds ASCII case, so a SQL-side fold can't be trusted to find exact
  // matches that differ only by case in non-Latin scripts (e.g. "Привет" vs "ПРИВЕТ"). For those,
  // skip the SQL filter and let the JS-side normalizeForSearch check below do the real matching.
  const hasNonAsciiSearchText = trimmedSearchText
    ? [...trimmedSearchText].some((char) => char.charCodeAt(0) > 127)
    : false;
  let searchFilter = "";
  if (trimmedSearchText && exactTitleMatch && !hasNonAsciiSearchText) {
    searchFilter = ` AND ${foldSqlColumn("TRIM(note.ztitle1)")} = '${foldedSearchText}'`;
  } else if (trimmedSearchText && !exactTitleMatch) {
    searchFilter = ` AND (
      ${foldSqlColumn("note.ztitle1")} LIKE '%${foldedSearchText}%' OR
      ${foldSqlColumn("note.zsnippet")} LIKE '%${foldedSearchText}%'
    )`;
  }

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
        ${searchFilter}
    ORDER BY
        note.zmodificationdate1 DESC
    LIMIT ${maxQueryResults}
  `;

  const data = await executeSQL<NoteItem>(NOTES_DB, query);

  if (!data || data.length === 0) {
    return [];
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
    const noteLinks = links?.filter((link) => link.notePk === note.pk);

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

    const noteTags = tags?.filter((tag) => tag.notePk === note.pk);

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

  if (trimmedSearchText) {
    const normalizedQuery = normalizeForSearch(trimmedSearchText);
    notesWithAdditionalFields = notesWithAdditionalFields.filter((note) =>
      exactTitleMatch
        ? normalizeForSearch(note.title.trim()) === normalizedQuery
        : normalizeForSearch(note.title).includes(normalizedQuery) ||
          normalizeForSearch(note.snippet).includes(normalizedQuery),
    );
    if (exactTitleMatch) {
      notesWithAdditionalFields = notesWithAdditionalFields.slice(0, maxQueryResults);
    }
  }

  return notesWithAdditionalFields;
}
