import { readFileSync } from "fs";
import path from "path";
import { homedir } from "os";
import { environment } from "@raycast/api";
import initSqlJs, { Database, ParamsObject } from "sql.js";

export interface Note {
  id: string;
  title: string;
  text: string;
  modifiedAt: Date;
  tags: string[];
  encrypted: boolean;
  formattedTags: string;
}

const BEAR_DB_PATH =
  homedir() + "/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite";
const BEAR_EPOCH = 978307200; // Start of 2001 as a timestamp
const SEARCH_NOTES_QUERY = `
SELECT
  notes.ZUNIQUEIDENTIFIER AS id,
  notes.ZTITLE AS title,
  notes.ZTEXT AS text,
  notes.ZMODIFICATIONDATE AS modified_at,
  group_concat(tags.ZTITLE) AS tags,
  notes.ZENCRYPTED AS encrypted
FROM
  ZSFNOTE AS notes
LEFT OUTER JOIN
  Z_7TAGS AS notes_to_tags ON notes.Z_PK = notes_to_tags.Z_7NOTES
LEFT OUTER JOIN
  ZSFNOTETAG AS tags ON notes_to_tags.Z_14TAGS = tags.Z_PK
WHERE
  -- When there is a query, filter the body by that query, otherwise
  -- ignore the query
  (
    lower(notes.ZTITLE) LIKE lower('%' || :query || '%')
    OR lower(notes.ZTEXT) LIKE lower('%' || :query || '%')
    OR :query = ''
    OR lower(notes.ZUNIQUEIDENTIFIER) LIKE lower('%' || :query || '%')
  )
  -- Ignore trashed, archived, and empty notes
  AND notes.ZARCHIVED = 0
  AND notes.ZTRASHED = 0
  AND (
    notes.ZTEXT IS NOT NULL
    OR notes.ZENCRYPTED = 1
  )
GROUP BY
  notes.ZUNIQUEIDENTIFIER
ORDER BY
  -- Sort title matches ahead of body matches
  CASE WHEN (
    lower(notes.ZTITLE) like lower('%' || :query || '%')
    OR :query = ''
  ) THEN 0 ELSE 1 END,
  -- When there are multiple title matches, sort by last modified
  notes.ZMODIFICATIONDATE DESC
LIMIT
  20
`;

const SEARCH_BACKLINKS = `
  SELECT DISTINCT
  note.ZUNIQUEIDENTIFIER AS id,
  note.ZTITLE AS title,
  note.ZTEXT AS text,
  note.ZMODIFICATIONDATE AS modified_at,
  group_concat(tag.ZTITLE) AS tags
FROM
	ZSFNOTE note
	LEFT OUTER JOIN Z_7TAGS nTag ON note.Z_PK = nTag.Z_7NOTES
	LEFT OUTER JOIN ZSFNOTETAG tag ON nTag.Z_14TAGS = tag.Z_PK
WHERE
	note.ZUNIQUEIDENTIFIER in(
		SELECT
			src.ZUNIQUEIDENTIFIER FROM ZSFNOTE src
			JOIN Z_7LINKEDNOTES lnk ON lnk.Z_7LINKEDBYNOTES = src.Z_PK
			JOIN ZSFNOTE trgt ON lnk.Z_7LINKEDNOTES = trgt.Z_PK
		WHERE
			trgt.ZUNIQUEIDENTIFIER LIKE :id )
GROUP BY
	note.ZUNIQUEIDENTIFIER
ORDER BY
	note.ZMODIFICATIONDATE DESC
LIMIT 400
`;

const SEARCH_NOTE_LINKS = `
SELECT DISTINCT
  note.ZUNIQUEIDENTIFIER AS id,
  note.ZTITLE AS title,
  note.ZTEXT AS text,
  note.ZMODIFICATIONDATE AS modified_at,
  group_concat(tag.ZTITLE) AS tags
FROM
	ZSFNOTE note
	LEFT OUTER JOIN Z_7TAGS nTag ON note.Z_PK = nTag.Z_7NOTES
	LEFT OUTER JOIN ZSFNOTETAG tag ON nTag.Z_14TAGS = tag.Z_PK
WHERE
	note.ZUNIQUEIDENTIFIER in(
		SELECT
			trgt.ZUNIQUEIDENTIFIER FROM ZSFNOTE src
			JOIN Z_7LINKEDNOTES lnk ON lnk.Z_7LINKEDBYNOTES = src.Z_PK
			JOIN ZSFNOTE trgt ON lnk.Z_7LINKEDNOTES = trgt.Z_PK
		WHERE
			src.ZUNIQUEIDENTIFIER LIKE :id )
GROUP BY
	note.ZUNIQUEIDENTIFIER
ORDER BY
	note.ZMODIFICATIONDATE DESC
LIMIT 400
`;

export async function loadDatabase(): Promise<BearDb> {
  const SQL = await initSqlJs({ locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm") });
  const db = readFileSync(BEAR_DB_PATH);
  return new BearDb(new SQL.Database(db));
}

/**
 * Get a nicely formatted string of tags from an array of tags
 *
 * @param tagStr - A `SqlVallue` containing the string of comma seperated tags
 * @returns
 */
function formatTags(tags: string[]): string {
  if (tags.length === 0) {
    return "Not Tagged";
  }
  const formattedTags = [];
  for (const tag of tags) {
    // Only format tag if tah is not subtag
    if (tags.filter((t) => t.includes(tag)).length < 2) {
      // Format tags with spaces like Bear (two hashtags)
      formattedTags.push(tag.includes(" ") ? `#${tag}#` : `#${tag}`);
    }
  }
  return formattedTags.join(" ");
}

export class BearDb {
  database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  close() {
    this.database.close();
  }

  private toNote(row: ParamsObject): Note {
    const tags = (row.tags as string | undefined)?.split(",") ?? [];
    return {
      id: row.id as string,
      title: row.title as string,
      text: row.text as string,
      modifiedAt: new Date(((row.modified_at as number) + BEAR_EPOCH) * 1000),
      tags: tags,
      formattedTags: formatTags(tags),
      encrypted: row.encrypted === 1,
    };
  }

  getNotes(searchQuery: string): Note[] {
    const statement = this.database.prepare(SEARCH_NOTES_QUERY);
    statement.bind({ ":query": searchQuery });

    const results: Note[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      results.push(this.toNote(row));
    }

    statement.free();

    return results;
  }

  getBacklinks(noteID: string): Note[] {
    const statement = this.database.prepare(SEARCH_BACKLINKS);
    statement.bind({ ":id": noteID });

    const results: Note[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      results.push(this.toNote(row));
    }

    statement.free();

    return results;
  }

  getNoteLinks(noteID: string): Note[] {
    const statement = this.database.prepare(SEARCH_NOTE_LINKS);
    statement.bind({ ":id": noteID });

    const results: Note[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      results.push(this.toNote(row));
    }

    statement.free();

    return results;
  }
}
