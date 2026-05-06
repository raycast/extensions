import { Cache } from "@raycast/api";
import { z } from "zod";
import { Db, withDb } from "./sqlite";

export const RAYCAST_HISTORY_CHAR_CAP = 32_768;
export const PREVIEW_CHAR_LIMIT = 200;

const SCHEMA_VERSION = "1";
const SCHEMA_CACHE_KEY = "schema-version";
const cache = new Cache();

const ClipRowSchema = z.object({
  id: z.number(),
  preview: z.string(),
  char_count: z.number(),
  created_at: z.number(),
});
const ClipRowsSchema = z.array(ClipRowSchema);
const ContentRowSchema = z.object({ content: z.string() });

export type ClipRow = z.infer<typeof ClipRowSchema>;

let schemaReadyInProcess = false;

function ensureSchemaSync({ db }: { db: Db }) {
  if (schemaReadyInProcess) return;
  if (cache.get(SCHEMA_CACHE_KEY) === SCHEMA_VERSION) {
    schemaReadyInProcess = true;
    return;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS clips (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sha256      TEXT    NOT NULL UNIQUE,
      content     TEXT    NOT NULL,
      char_count  INTEGER NOT NULL,
      preview     TEXT    NOT NULL,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);
  `);
  cache.set(SCHEMA_CACHE_KEY, SCHEMA_VERSION);
  schemaReadyInProcess = true;
}

export async function withVault<T>({ run }: { run: (db: Db) => T }) {
  return withDb({
    run: (db) => {
      ensureSchemaSync({ db });
      return run(db);
    },
  });
}

function escapeLikePattern({ value }: { value: string }) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function listClips({ search, limit }: { search: string; limit: number }) {
  return withVault({
    run: (db) => {
      if (search.trim().length > 0) {
        const stmt = db.prepare(`
          SELECT id, preview, char_count, created_at FROM clips
          WHERE content LIKE ? ESCAPE '\\'
          ORDER BY created_at DESC
          LIMIT ?
        `);
        return ClipRowsSchema.parse(stmt.all(`%${escapeLikePattern({ value: search })}%`, limit));
      }
      const stmt = db.prepare(`
        SELECT id, preview, char_count, created_at FROM clips
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return ClipRowsSchema.parse(stmt.all(limit));
    },
  });
}

export async function getClipContent({ id }: { id: number }) {
  return withVault({
    run: (db) => {
      const value = db.prepare(`SELECT content FROM clips WHERE id = ?`).get(id);
      if (!value) return undefined;
      return ContentRowSchema.parse(value).content;
    },
  });
}

export async function deleteClipById({ id }: { id: number }) {
  return withVault({
    run: (db) => {
      db.prepare(`DELETE FROM clips WHERE id = ?`).run(id);
    },
  });
}
