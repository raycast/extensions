import { readFileSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { environment } from '@raycast/api';
import initSqlJs, { Database } from 'sql.js'

export interface Note {
  id: string,
  title: string,
  text: string,
  modifiedAt: Date,
  tags: string[]
}

const BEAR_DB_PATH = homedir() + '/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite';
const BEAR_EPOCH = 978307200; // Start of 2001 as a timestamp
const SEARCH_NOTES_QUERY = `
SELECT
  notes.ZUNIQUEIDENTIFIER AS id,
  notes.ZTITLE AS title,
  notes.ZTEXT AS text,
  notes.ZMODIFICATIONDATE AS modified_at,
  group_concat(tags.ZTITLE) AS tags
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
    lower(notes.ZTEXT) like lower('%' || :query || '%')
    OR :query = ''
  )
  -- Ignore trashed, archived, and empty notes
  AND notes.ZARCHIVED = 0
  AND notes.ZTRASHED = 0
  AND notes.ZTEXT IS NOT NULL
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

export async function loadDatabase(): Promise<BearDb> {
  const SQL = await initSqlJs({ locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm") });
  const db = readFileSync(BEAR_DB_PATH);
  return new BearDb(new SQL.Database(db));
}

export class BearDb {
  database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  close() {
    this.database.close();
  }

  getNotes(searchQuery: string): Note[] {
    const statement = this.database.prepare(SEARCH_NOTES_QUERY);
    statement.bind({ ':query': searchQuery });

    const results: Note[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      results.push({
        id: row.id as string,
        title: row.title as string,
        text: row.text as string,
        modifiedAt: new Date((row.modified_at as number + BEAR_EPOCH) * 1000),
        tags: ((row.tags) as string | undefined)?.split(',') ?? []
      });
    }

    statement.free();

    return results;
  }
}