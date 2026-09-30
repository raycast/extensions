import { Cache, environment, getPreferenceValues } from "@raycast/api";
import { mkdirSync } from "fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "path";
import { SteamGameHit } from "../types";
import { steamFetch } from "./http";

const SCHEMA_VERSION = 8;
const PAGE_SIZE = 50_000;
const WRITE_CHUNK = 2_000;
// Steam's list has no total, so progress uses the last download's count, kept outside the list file so it
// survives a rebuild, or roughly the catalog size (191,956 in Sept 2026) before the first download
const countCache = new Cache({ namespace: "game-list" });
const expectedApps = () => Number(countCache.get("app-count")) || 200_000;

type AppListResponse = {
  response?: {
    apps?: { appid: number; name?: string; last_modified?: number }[];
    have_more_results?: boolean;
    last_appid?: number;
  };
};

export class IndexSyncError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const progressListeners = new Set<(fraction: number) => void>();

export function onSyncProgress(listener: (fraction: number) => void) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

let database: DatabaseSync | undefined;
let syncing: Promise<void> | undefined;

// SQLite's LIKE folds ASCII case only, so names are stored and searched in this folded form
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function db() {
  if (database) return database;
  mkdirSync(environment.supportPath, { recursive: true });
  const opened = new DatabaseSync(join(environment.supportPath, "apps.sqlite"));
  try {
    // A command and its AI tools can open the file at once, so wait for locks and migrate atomically
    opened.exec("PRAGMA busy_timeout = 5000");
    opened.exec("PRAGMA journal_mode = WAL");
    opened.exec("BEGIN IMMEDIATE");
    try {
      const { user_version } = opened.prepare("PRAGMA user_version").get() as { user_version: number };
      if (user_version !== SCHEMA_VERSION) {
        opened.exec(`
          DROP TABLE IF EXISTS name_fts;
          DROP TABLE IF EXISTS name;
          DROP TABLE IF EXISTS app_fts;
          DROP TABLE IF EXISTS app;
          DROP TABLE IF EXISTS meta;
          CREATE TABLE app (
            appid INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            compact_name TEXT NOT NULL COLLATE NOCASE,
            padded_name TEXT NOT NULL,
            kind TEXT NOT NULL,
            generation INTEGER NOT NULL,
            first_seen INTEGER NOT NULL DEFAULT 0,
            last_modified INTEGER NOT NULL DEFAULT 0
          );
          -- Every name an app has had, so a game stays findable by its old title after a rename
          CREATE TABLE name (
            id INTEGER PRIMARY KEY,
            appid INTEGER NOT NULL,
            compact_name TEXT NOT NULL COLLATE NOCASE,
            padded_name TEXT NOT NULL,
            UNIQUE (appid, compact_name)
          );
          CREATE INDEX name_compact_name ON name (compact_name);
          CREATE VIRTUAL TABLE name_fts USING fts5(
            compact_name, content = 'name', content_rowid = 'id', tokenize = 'trigram', detail = 'none'
          );
          CREATE TRIGGER name_insert AFTER INSERT ON name BEGIN
            INSERT INTO name_fts (rowid, compact_name) VALUES (new.id, new.compact_name);
          END;
          CREATE TRIGGER name_delete AFTER DELETE ON name BEGIN
            INSERT INTO name_fts (name_fts, rowid, compact_name) VALUES ('delete', old.id, old.compact_name);
          END;
          CREATE TRIGGER app_insert AFTER INSERT ON app BEGIN
            INSERT OR IGNORE INTO name (appid, compact_name, padded_name)
            VALUES (new.appid, new.compact_name, new.padded_name);
          END;
          CREATE TRIGGER app_rename AFTER UPDATE OF compact_name ON app
          WHEN old.compact_name IS NOT new.compact_name BEGIN
            INSERT OR IGNORE INTO name (appid, compact_name, padded_name)
            VALUES (new.appid, new.compact_name, new.padded_name);
          END;
          CREATE TRIGGER app_delete AFTER DELETE ON app BEGIN
            DELETE FROM name WHERE appid = old.appid;
          END;
          CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          PRAGMA user_version = ${SCHEMA_VERSION};
        `);
      }
      // Outside the versioned schema so rebuilding the game list keeps each game's first-seen date
      opened.exec(`
        CREATE TABLE IF NOT EXISTS library (
          owner TEXT NOT NULL,
          appid INTEGER NOT NULL,
          first_seen INTEGER NOT NULL,
          baseline INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (owner, appid)
        );
      `);
      const columns = opened.prepare("PRAGMA table_info(library)").all() as { name: string }[];
      if (!columns.some((column) => column.name === "baseline")) {
        // Earlier builds stored 0 for the first import; its rows date from now instead
        opened.exec(`
          ALTER TABLE library ADD COLUMN baseline INTEGER NOT NULL DEFAULT 0;
          UPDATE library SET baseline = 1, first_seen = unixepoch() WHERE first_seen = 0;
        `);
      }
      // Added in place, since a new schema version would download the whole list again
      const appColumns = opened.prepare("PRAGMA table_info(app)").all() as { name: string }[];
      if (!appColumns.some((column) => column.name === "first_seen")) {
        opened.exec(`
          ALTER TABLE app ADD COLUMN first_seen INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE app ADD COLUMN last_modified INTEGER NOT NULL DEFAULT 0;
        `);
      }
      opened.exec(`
        CREATE INDEX IF NOT EXISTS app_first_seen ON app (first_seen);
        CREATE INDEX IF NOT EXISTS app_last_modified ON app (last_modified);
      `);
      opened.exec("COMMIT");
    } catch (error) {
      opened.exec("ROLLBACK");
      throw error;
    }
  } catch (error) {
    opened.close();
    throw error;
  }
  database = opened;
  return database;
}

function syncedAt() {
  const row = db().prepare("SELECT value FROM meta WHERE key = 'synced_at'").get() as { value: string } | undefined;
  return Number(row?.value ?? 0);
}

export function isIndexReady() {
  try {
    return syncedAt() > 0;
  } catch {
    return false;
  }
}

export function indexAgeDays() {
  return (Date.now() / 1000 - syncedAt()) / 86_400;
}

// A Monthly setting saved before that option was removed still reads 30
export const refreshDays = () => Math.min(Number(getPreferenceValues<Preferences>().indexRefresh) || 1, 7);

export function isIndexStale(maxAgeDays: number) {
  return indexAgeDays() > maxAgeDays;
}

export function syncIndex(key: string) {
  syncing ??= runSync(key).finally(() => {
    syncing = undefined;
  });
  return syncing;
}

// Every sync downloads the whole list, so renamed games update and removed ones drop out
async function runSync(key: string) {
  const startedAt = Math.floor(Date.now() / 1000);
  // The first download can't tell new apps from old ones, so its apps get no added date
  const addedAt = syncedAt() ? startedAt : 0;
  const upsert = db().prepare(
    `INSERT INTO app (appid, name, compact_name, padded_name, kind, generation, first_seen, last_modified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (appid) DO UPDATE SET name = excluded.name, compact_name = excluded.compact_name,
       padded_name = excluded.padded_name, kind = excluded.kind, generation = excluded.generation,
       last_modified = excluded.last_modified`,
  );
  let written = 0;
  const expected = expectedApps();
  // Each category comes down separately so every app knows its kind and settings can hide any of them
  for (const kind of KINDS) {
    let lastAppid = 0;
    for (;;) {
      const url = new URL("https://api.steampowered.com/IStoreService/GetAppList/v1/");
      url.searchParams.set("key", key);
      url.searchParams.set("max_results", String(PAGE_SIZE));
      for (const other of KINDS) url.searchParams.set(CATEGORY_PARAM[other], String(other === kind));
      if (lastAppid) url.searchParams.set("last_appid", String(lastAppid));

      const response = await steamFetch(url);
      if (!response.ok) {
        throw new IndexSyncError(
          response.status === 401 || response.status === 403
            ? "Steam rejected the Web API Key"
            : `Could not download the Steam game list (${response.status})`,
          response.status,
        );
      }
      const { response: page } = (await response.json()) as AppListResponse;

      const apps = page?.apps ?? [];
      for (let start = 0; start < apps.length; start += WRITE_CHUNK) {
        db().exec("BEGIN");
        try {
          for (const app of apps.slice(start, start + WRITE_CHUNK)) {
            if (app.appid && app.name) {
              upsert.run(
                app.appid,
                app.name,
                compact(app.name),
                padded(app.name),
                kind,
                startedAt,
                addedAt,
                app.last_modified ?? 0,
              );
            }
          }
          db().exec("COMMIT");
        } catch (error) {
          db().exec("ROLLBACK");
          throw error;
        }
        written += Math.min(WRITE_CHUNK, apps.length - start);
        progressListeners.forEach((listener) => listener(Math.min(written / expected, 0.99)));
        // Writes share a thread with the open list, so yield between chunks to keep it responsive
        await new Promise((resolve) => setImmediate(resolve));
      }

      if (!page?.have_more_results || !page.last_appid) break;
      lastAppid = page.last_appid;
    }
  }
  db().prepare("DELETE FROM app WHERE generation != ?").run(startedAt);
  countCache.set("app-count", String(written));
  db()
    .prepare(
      "INSERT INTO meta (key, value) VALUES ('synced_at', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    )
    .run(String(startedAt));
}

type IndexRow = { appid: number; name: string; compact_name: string; padded_name: string };

const words = (text: string) => normalize(text).split(" ").filter(Boolean);
const compact = (text: string) => words(text).join("");
// pg_trgm pads each word as "  word ", so trigrams also record where words start and end
const padded = (text: string) =>
  words(text)
    .map((word) => `  ${word} `)
    .join("");

const trigramsOf = (text: string) => {
  const trigrams = new Set<string>();
  for (let i = 0; i + 3 <= text.length; i++) trigrams.add(text.slice(i, i + 3));
  return trigrams;
};

export const KINDS = ["game", "software", "dlc", "video", "hardware"] as const;
export type AppKind = (typeof KINDS)[number];

const CATEGORY_PARAM: Record<AppKind, string> = {
  game: "include_games",
  software: "include_software",
  dlc: "include_dlc",
  video: "include_videos",
  hardware: "include_hardware",
};

export function shownKinds(): AppKind[] {
  const prefs = getPreferenceValues<Preferences>();
  const shown: Record<AppKind, boolean | undefined> = {
    game: prefs.showGames,
    software: prefs.showSoftware,
    dlc: prefs.showDlc,
    video: prefs.showVideos,
    hardware: prefs.showHardware,
  };
  return KINDS.filter((kind) => shown[kind] !== false);
}

const kindList = (kinds: readonly AppKind[]) => kinds.map((kind) => `'${kind}'`).join(", ") || "''";

const kindFilter = () => {
  const shown = shownKinds();
  return shown.length === KINDS.length ? "" : ` AND app.kind IN (${kindList(shown)})`;
};

export function hiddenAppids(appids: number[]) {
  const shown = shownKinds();
  if (shown.length === KINDS.length) return new Set<number>();
  const rows = db()
    .prepare(
      `SELECT appid FROM app WHERE kind NOT IN (${kindList(shown)}) AND appid IN (SELECT value FROM json_each(?))`,
    )
    .all(JSON.stringify(appids)) as { appid: number }[];
  return new Set(rows.map((row) => row.appid));
}

export function searchIndex(term: string, limit = 50): SteamGameHit[] {
  const queryWords = words(term);
  if (!queryWords.length) return [];

  // Queries shorter than a trigram can only match the start of a name
  if (queryWords.join("").length < 3) {
    return db()
      .prepare(
        `SELECT DISTINCT app.appid, app.name FROM name JOIN app ON app.appid = name.appid WHERE name.compact_name LIKE ?${kindFilter()} ORDER BY length(app.name) LIMIT ${limit}`,
      )
      .all(`${queryWords.join("")}%`) as SteamGameHit[];
  }

  const candidateTrigrams = new Set(queryWords.flatMap((word) => [...trigramsOf(word)]));
  if (!candidateTrigrams.size) candidateTrigrams.add(queryWords.join("").slice(0, 3));
  const rows = db()
    .prepare(
      `SELECT app.appid, app.name, name.compact_name, name.padded_name
       FROM name_fts JOIN name ON name.id = name_fts.rowid JOIN app ON app.appid = name.appid
       WHERE name_fts MATCH ?${kindFilter()}`,
    )
    .all([...candidateTrigrams].map((trigram) => `"${trigram}"`).join(" OR ")) as IndexRow[];

  // Padded trigrams reward whole words; compact ones, weighted low, forgive missing spaces ("witcher3")
  const paddedTrigrams = trigramsOf(padded(term));
  const compactTrigrams = trigramsOf(compact(term));
  const count = (trigrams: Set<string>, text: string) => {
    let shared = 0;
    for (const trigram of trigrams) if (text.includes(trigram)) shared++;
    return shared;
  };
  const ranked = rows
    .map((row) => {
      const shared = count(paddedTrigrams, row.padded_name);
      const score =
        shared / paddedTrigrams.size + (0.25 * count(compactTrigrams, row.compact_name)) / compactTrigrams.size;
      // A padded word of n letters has n + 1 trigrams
      const nameTrigrams = row.padded_name.replaceAll(" ", "").length + row.padded_name.split("  ").length - 1;
      return { row, shared, score, similarity: shared / (paddedTrigrams.size + nameTrigrams - shared) };
    })
    .filter(({ shared }) => shared >= Math.ceil(paddedTrigrams.size / 2))
    .sort((a, b) => b.score - a.score || b.similarity - a.similarity);

  // An app matched by both its current and an old name keeps its best-scoring match
  const seen = new Set<number>();
  const hits: SteamGameHit[] = [];
  for (const { row } of ranked) {
    if (seen.has(row.appid)) continue;
    seen.add(row.appid);
    hits.push({ appid: row.appid, name: row.name });
    if (hits.length === limit) break;
  }
  return hits;
}

export function addedSince(seconds: number) {
  const count = (sql: string) => (db().prepare(sql).get(seconds) as { count: number }).count;
  return {
    apps: count("SELECT count(*) AS count FROM app WHERE first_seen >= ?"),
    owned: count("SELECT count(*) AS count FROM library WHERE baseline = 0 AND first_seen >= ?"),
  };
}

export type ListedApp = { appid: number; name: string; kind: AppKind; added: number; updated: number };

export function latestApps(by: "added" | "updated", limit: number) {
  const column = by === "added" ? "first_seen" : "last_modified";
  return db()
    .prepare(
      `SELECT appid, name, kind, first_seen AS added, last_modified AS updated FROM app
       WHERE ${column} > 0${kindFilter()} ORDER BY ${column} DESC, appid DESC LIMIT ?`,
    )
    .all(limit) as ListedApp[];
}

export function randomFromIndex(count: number): SteamGameHit[] {
  return db()
    .prepare(`SELECT appid, name FROM app WHERE 1${kindFilter()} ORDER BY random() LIMIT ${count}`)
    .all() as SteamGameHit[];
}

export function recordLibrary(owner: string, appids: number[]) {
  const d = db();
  d.exec("BEGIN");
  try {
    d.prepare("DELETE FROM library WHERE owner != ?").run(owner);
    const { count } = d.prepare("SELECT count(*) AS count FROM library WHERE owner = ?").get(owner) as {
      count: number;
    };
    // A first import can't tell new games from old ones, so it is marked as the baseline and never counts
    // as recently added, though its date still shows when each game entered the local library
    const insert = d.prepare("INSERT OR IGNORE INTO library (owner, appid, first_seen, baseline) VALUES (?, ?, ?, ?)");
    for (const appid of appids) insert.run(owner, appid, Math.floor(Date.now() / 1000), count ? 0 : 1);
    d.prepare("DELETE FROM library WHERE owner = ? AND appid NOT IN (SELECT value FROM json_each(?))").run(
      owner,
      JSON.stringify(appids),
    );
    d.exec("COMMIT");
  } catch (error) {
    d.exec("ROLLBACK");
    throw error;
  }
}

export type LibraryEntry = { firstSeen: number; baseline: boolean };

export function libraryFirstSeen(owner: string) {
  const rows = db().prepare("SELECT appid, first_seen, baseline FROM library WHERE owner = ?").all(owner) as {
    appid: number;
    first_seen: number;
    baseline: number;
  }[];
  return new Map<number, LibraryEntry>(
    rows.map((row) => [row.appid, { firstSeen: row.first_seen, baseline: Boolean(row.baseline) }]),
  );
}
