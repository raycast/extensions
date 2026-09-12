/**
 * Reading Jotaid's note store.
 *
 * Jotaid is a sandboxed app, so its Core Data store lives in the App Group container it
 * shares with its own extensions. This file is the only place that knows where that is,
 * what the columns are called, and how Core Data spells a UUID or a date.
 *
 * Everything here is read-only. The store belongs to a running app; this extension must
 * never write to it, checkpoint it, or otherwise touch the user's data.
 */

import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const APP_GROUP_SUPPORT_DIR = join(
  homedir(),
  "Library",
  "Group Containers",
  "group.np.Jotaid",
  "Library",
  "Application Support",
);

/**
 * Release first, then the Debug/Staging store.
 *
 * A released Jotaid only ever writes `Jotaid_v2.sqlite`; the `_dev` name exists so that a
 * development build does not scribble on the real library (`SharedStoreConstants`). Falling
 * back means this extension keeps working while developing Jotaid itself, without exposing
 * a preference that would mean nothing to everyone else.
 */
const STORE_FILENAMES = ["Jotaid_v2.sqlite", "Jotaid_v2_dev.sqlite"];

/** Path of the store to read, or `undefined` when Jotaid has never run on this Mac. */
export function findDatabasePath(): string | undefined {
  return STORE_FILENAMES.map((name) => join(APP_GROUP_SUPPORT_DIR, name)).find((path) => existsSync(path));
}

/**
 * Core Data's epoch is 2001-01-01 UTC, so its timestamps are this far behind Unix time.
 */
const CORE_DATA_EPOCH_OFFSET = 978_307_200;

/** The three levels of Jotaid's note hierarchy, as stored in `ZNOTE.ZNOTETYPE`. */
export type NoteType = "note" | "theme" | "project";

export interface Note {
  /** Lower-case UUID, ready to hand to `jotaid://open-note`. */
  id: string;
  title: string;
  content: string;
  noteType: NoteType;
  /** Unix seconds. */
  modifiedAt: number;
  /** Name of the containing project or theme; `null` for notes sitting in the Inbox. */
  groupName: string | null;
}

/**
 * `ZID` is a 16-byte BLOB holding the UUID's bytes in order, which is exactly what the
 * canonical 8-4-4-4-12 string spells out — so the conversion is pure text surgery on the
 * hex, and doing it in SQL keeps the row shape identical to the `Note` interface.
 */
const UUID_FROM_BLOB = `lower(
  substr(hex(n.ZID), 1, 8) || '-' ||
  substr(hex(n.ZID), 9, 4) || '-' ||
  substr(hex(n.ZID), 13, 4) || '-' ||
  substr(hex(n.ZID), 17, 4) || '-' ||
  substr(hex(n.ZID), 21, 12)
)`;

/**
 * Escapes a value for a single-quoted SQL string literal.
 *
 * The query has to be assembled as text because that is the shape `useSQL` takes, and the
 * search text comes from whatever the user types — an apostrophe alone would otherwise
 * break the statement.
 */
function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Escapes the LIKE wildcards so that a literal `%` or `_` matches itself. */
function likePattern(value: string): string {
  return quote(`%${value.replace(/[\\%_]/g, "\\$&")}%`);
}

/**
 * How many rows to pull back.
 *
 * Filtering happens in SQL rather than in the list component so that a large library stays
 * cheap: only this many notes ever cross into JavaScript, whatever the library's size.
 */
const RESULT_LIMIT = 200;

/** Escapes a string for literal use inside a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Marks every occurrence of the search term so the reason a note matched is visible.
 *
 * Raycast renders the detail pane as strict CommonMark: no HTML, no coloured text, no
 * `==highlight==`. A code span is therefore the only construct that draws a *filled* mark
 * rather than merely a heavier weight — bold is easy to miss halfway down a long note.
 *
 * Both a code span and `**` may sit inside a word, which a prefix match like "jup" in
 * "Jupyter" needs. Casing is whatever the note used.
 *
 * A term containing a backtick would break out of the span, so those fall back to bold —
 * losing the mark on a rare search is better than corrupting the whole preview.
 */
export function highlightTerm(content: string, searchText: string): string {
  const term = searchText.trim();
  if (term.length === 0) {
    return content;
  }
  const mark = term.includes("`") ? (match: string) => `**${match}**` : (match: string) => `\`${match}\``;
  return content.replace(new RegExp(escapeRegExp(term), "gi"), mark);
}

/**
 * A short window of text around the first match, for the list row.
 *
 * The row otherwise shows only the title, and Jotaid deliberately leaves the title blank on
 * captured notes so its own AI can fill it in later — so "Untitled" is exactly the case where
 * the user most needs to be told what matched.
 */
export function matchContext(note: Note, searchText: string, radius = 60): string | undefined {
  const term = searchText.trim();
  if (term.length === 0) {
    return undefined;
  }
  const body = note.content ?? "";
  const at = body.toLowerCase().indexOf(term.toLowerCase());
  if (at < 0) {
    return undefined;
  }
  const start = Math.max(0, at - radius);
  const end = Math.min(body.length, at + term.length + radius);
  // Newlines would be rendered as spaces anyway; collapsing them keeps the row one line.
  const snippet = body.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${snippet}${end < body.length ? "…" : ""}`;
}

/**
 * A note is only really there when `ZDELETEDAT` is null — Jotaid deletes softly so that the
 * trash, and CloudKit, still have something to work with.
 */
export function notesQuery(searchText: string, searchContent: boolean): string {
  const term = searchText.trim();
  const conditions = ["n.ZDELETEDAT IS NULL"];

  if (term.length > 0) {
    const pattern = likePattern(term);
    const matches = [`n.ZTITLE LIKE ${pattern} ESCAPE '\\'`];
    if (searchContent) {
      matches.push(`n.ZCONTENT LIKE ${pattern} ESCAPE '\\'`);
    }
    conditions.push(`(${matches.join(" OR ")})`);
  }

  return `
    SELECT ${UUID_FROM_BLOB} AS id,
           n.ZTITLE AS title,
           n.ZCONTENT AS content,
           n.ZNOTETYPE AS noteType,
           CAST(n.ZMODIFIEDAT + ${CORE_DATA_EPOCH_OFFSET} AS INTEGER) AS modifiedAt,
           g.ZNAME AS groupName
    FROM ZNOTE n
    LEFT JOIN ZNOTEGROUP g ON n.ZGROUP = g.Z_PK AND g.ZDELETEDAT IS NULL
    WHERE ${conditions.join(" AND ")}
    ORDER BY n.ZMODIFIEDAT DESC
    LIMIT ${RESULT_LIMIT}
  `;
}
