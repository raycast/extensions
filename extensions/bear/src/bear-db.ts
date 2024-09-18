import { environment } from "@raycast/api";
import { readFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import initSqlJs, { Database, ParamsObject } from "sql.js";
import {
  ALL_TAGS_V1,
  ALL_TAGS_V2,
  SEARCH_BACKLINKS_V1,
  SEARCH_BACKLINKS_V2,
  SEARCH_LINKS_V1,
  SEARCH_LINKS_V2,
  SEARCH_NOTES_V1,
  SEARCH_NOTES_V2,
  TABLE_EXISTS,
} from "./db-queries";

export interface Note {
  id: string;
  title: string;
  text: string;
  modifiedAt: Date;
  createdAt: Date;
  tags: string[];
  encrypted: boolean;
  pinned: boolean;
  formattedTags: string;
  wordCount: number;
}

const BEAR_DB_PATH =
  homedir() + "/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite";

const BEAR_EPOCH = 978307200; // Start of 2001 as a timestamp

export async function loadDatabase(): Promise<BearDb> {
  const wasmBinary = readFileSync(path.join(environment.assetsPath, "sql-wasm.wasm"));
  const SQL = await initSqlJs({ wasmBinary });
  const db = readFileSync(BEAR_DB_PATH);
  return new BearDb(new SQL.Database(db));
}

function formatTags(tags: string[]): string {
  if (tags.length === 0) {
    return "Not Tagged";
  }
  const formattedTags = [];
  for (const tag of tags) {
    // Only format tag if tag is not subtag
    if (tags.filter((t) => t.includes(tag)).length < 2) {
      // Format tags with spaces like Bear (two hashtags)
      formattedTags.push(tag.includes(" ") ? `#${tag}#` : `#${tag}`);
    }
  }
  return formattedTags.join(" ");
}

export class BearDb {
  database: Database;

  static searchNotesQueries = {
    v1: SEARCH_NOTES_V1,
    v2: SEARCH_NOTES_V2,
  };

  static getNoteLinksQueries = {
    v1: SEARCH_LINKS_V1,
    v2: SEARCH_LINKS_V2,
  };

  static getNoteBacklinksQueries = {
    v1: SEARCH_BACKLINKS_V1,
    v2: SEARCH_BACKLINKS_V2,
  };

  static getTags = {
    v1: ALL_TAGS_V1,
    v2: ALL_TAGS_V2,
  };

  constructor(database: Database) {
    this.database = database;
  }

  close() {
    this.database.close();
  }

  private toNote(row: ParamsObject): Note {
    const tags = (row.tags as string | undefined)?.split(",") ?? [];
    const text = (row.text as string) ?? "";
    return {
      id: row.id as string,
      title: row.title as string,
      text,
      modifiedAt: new Date(((row.modified_at as number) + BEAR_EPOCH) * 1000),
      createdAt: new Date(((row.created_at as number) + BEAR_EPOCH) * 1000),
      tags: tags,
      formattedTags: formatTags(tags),
      encrypted: row.encrypted === 1,
      pinned: row.pinned === 1,
      wordCount: [...text.matchAll(/\b\w+\b/g)].length,
    };
  }

  tableExists(tableName: string): boolean {
    const statement = this.database.prepare(TABLE_EXISTS);
    statement.bind({ ":name": tableName });
    const result = statement.step();
    statement.free();
    return result;
  }

  getBearVersion(): number {
    const z5TagsExist = this.tableExists("Z_5TAGS");
    return z5TagsExist ? 2 : 1;
  }

  getNotes(searchQuery: string, tag?: string): Note[] {
    const statement = this.database.prepare(
      this.getBearVersion() === 2 ? BearDb.searchNotesQueries.v2 : BearDb.searchNotesQueries.v1,
    );
    if (tag) {
      statement.bind({ ":query": `${searchQuery}`, ":tag": `${tag}` });
    } else {
      statement.bind({ ":query": `${searchQuery}` });
    }
    const results: Note[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      results.push(this.toNote(row));
    }

    statement.free();
    // pinned notes should be at the top
    results.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
    return results;
  }

  getTags(): string[] {
    const statement = this.database.prepare(this.getBearVersion() === 2 ? BearDb.getTags.v2 : BearDb.getTags.v1);
    const results: string[] = [];
    while (statement.step()) {
      const row = statement.getAsObject();
      if (row.tags !== null) results.push(row.tags as string);
    }

    statement.free();

    return results;
  }

  getBacklinks(noteID: string): Note[] {
    const statement = this.database.prepare(
      this.getBearVersion() === 2 ? BearDb.getNoteBacklinksQueries.v2 : BearDb.getNoteBacklinksQueries.v1,
    );
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
    const statement = this.database.prepare(
      this.getBearVersion() === 2 ? BearDb.getNoteLinksQueries.v2 : BearDb.getNoteLinksQueries.v1,
    );
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
