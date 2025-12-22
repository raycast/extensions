import { environment } from "@raycast/api";
import Fuse from "fuse.js";
import initSqlJs from "sql.js";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { ZoteroCollection, ZoteroItem } from "./types";

interface LocalItem {
  id: number;
  key: string;
  library: number;
  type: string;
  title?: string;
  creators?: string[];
  date?: string;
  dateAdded?: string;
  publicationTitle?: string;
  publisher?: string;
  institution?: string;
  archive?: string;
  repository?: string;
  url?: string;
  DOI?: string;
  abstractNote?: string;
  extra?: string;
  citationKey?: string;
  notes?: string[];
  tags?: string[];
  collections?: string[];
  [key: string]: unknown; // Allow dynamic metadata fields
}

const INVALID_TYPES_SQL = `
SELECT itemTypes.itemTypeID as tid
  FROM itemTypes
 WHERE itemTypes.typeName IN (
  'artwork',
  'attachment',
  'audioRecording',
  'bill',
  'computerProgram',
  'dictionaryEntry',
  'email',
  'film',
  'forumPost',
  'hearing',
  'instantMessage',
  'interview',
  'map',
  'note',
  'podcast',
  'radioBroadcast',
  'statute',
  'tvBroadcast',
  'videoRecording',
  'annotation'
 )
`;

const ITEMS_SQL = `
SELECT  items.itemID AS id,
        items.dateAdded AS added,
        items.key AS key,
        items.libraryID AS library,
        itemTypes.typeName AS type
    FROM items
    LEFT JOIN itemTypes
        ON items.itemTypeID = itemTypes.itemTypeID
    LEFT JOIN deletedItems
        ON items.itemID = deletedItems.itemID
WHERE items.itemTypeID not IN ?
AND deletedItems.dateDeleted IS NULL
`;

const TAGS_SQL = `
SELECT tags.name AS name
    FROM tags
    LEFT JOIN itemTags
        ON tags.tagID = itemTags.tagID
WHERE itemTags.itemID = :id
`;

const METADATA_SQL = `
SELECT  fields.fieldName AS name,
        itemDataValues.value AS value
    FROM itemData
    LEFT JOIN fields
        ON itemData.fieldID = fields.fieldID
    LEFT JOIN itemDataValues
        ON itemData.valueID = itemDataValues.valueID
WHERE itemData.itemID = :id
`;

const CREATORS_SQL = `
SELECT  creators.firstName AS given,
        creators.lastName AS family,
        itemCreators.orderIndex AS "index"
    FROM creators
    LEFT JOIN itemCreators
        ON creators.creatorID = itemCreators.creatorID
WHERE itemCreators.itemID = :id
ORDER BY "index" ASC
`;

const COLLECTIONS_SQL = `
SELECT  collections.key AS key,
        collections.collectionName AS name
    FROM collections
    LEFT JOIN collectionItems
        ON collections.collectionID = collectionItems.collectionID
WHERE collectionItems.itemID = :id
`;

const NOTES_SQL = `
SELECT itemNotes.note AS note
  FROM itemNotes
WHERE itemNotes.parentItemID = :id
`;

const ANNOTATIONS_SQL = `
SELECT itemAnnotations.annotationText AS text,
       itemAnnotations.annotationComment AS comment,
       itemAnnotations.annotationPageLabel AS pageLabel
  FROM itemAnnotations
 WHERE itemAnnotations.parentItemID = :id
`;

const ALL_COLLECTIONS_SQL = `
SELECT  collections.collectionName AS name,
        collections.key AS key,
        p.key AS parentKey
    FROM collections
    LEFT JOIN collections p
        ON p.collectionID = collections.parentCollectionID
`;

let cachedDbPath = "";
let cachedMtime = 0;
let cachedItems: LocalItem[] = [];
let cachedCollections: ZoteroCollection[] = [];
const CACHE_VERSION = 1;
const CACHE_FILENAME = "zotero-cache.json";

function resolveHome(filepath: string): string {
  if (filepath.startsWith("~/")) {
    return path.join(homedir(), filepath.slice(2));
  }
  return filepath;
}

async function openSqlJsDatabase(filePath: string) {
  const wasmBinary = readFileSync(
    path.join(environment.assetsPath, "sql-wasm.wasm"),
  );
  const SQL = await initSqlJs({ wasmBinary });
  const dbFile = await readFile(filePath);
  return new SQL.Database(dbFile);
}

async function openDb(dbPath: string) {
  const resolved = resolveHome(dbPath);
  const cachePath = path.join(environment.supportPath, "zotero.sqlite");
  await mkdir(environment.supportPath, { recursive: true });
  await copyFile(resolved, cachePath);
  return openSqlJsDatabase(cachePath);
}

async function openBibtexDb(dbPath: string) {
  const resolved = resolveHome(dbPath);
  let bibtexPath = resolved.replace("zotero.sqlite", "better-bibtex.sqlite");
  let table = "citationkey";
  let keyColumn = "citationKey";
  if (!existsSync(bibtexPath)) {
    bibtexPath = resolved.replace(
      "zotero.sqlite",
      "better-bibtex-search.sqlite",
    );
    table = "citekeys";
    keyColumn = "citekey";
  }
  if (!existsSync(bibtexPath)) return null;
  const cachePath = path.join(
    environment.supportPath,
    path.basename(bibtexPath),
  );
  await mkdir(environment.supportPath, { recursive: true });
  await copyFile(bibtexPath, cachePath);
  return { db: await openSqlJsDatabase(cachePath), table, keyColumn };
}

async function loadData(dbPath: string) {
  const db = await openDb(dbPath);
  const bibtexDb = await openBibtexDb(dbPath);
  const citationKeyMap = new Map<string, string>();

  if (bibtexDb) {
    const { db: bibDb, table, keyColumn } = bibtexDb;
    const statement = bibDb.prepare(
      `SELECT itemKey, libraryID, ${keyColumn} AS citekey FROM ${table}`,
    );
    while (statement.step()) {
      const row = statement.getAsObject() as {
        itemKey?: string;
        libraryID?: number;
        citekey?: string;
      };
      if (row.itemKey && row.citekey) {
        const libraryId = row.libraryID ?? 1;
        citationKeyMap.set(`${libraryId}:${row.itemKey}`, row.citekey);
      }
    }
    statement.free();
    bibDb.close();
  }

  const invalidTypeStatement = db.prepare(INVALID_TYPES_SQL);
  const invalidIds: number[] = [];
  while (invalidTypeStatement.step()) {
    const row = invalidTypeStatement.getAsObject() as { tid?: number };
    if (row.tid !== undefined) invalidIds.push(row.tid);
  }
  invalidTypeStatement.free();

  const invalidList = `( ${invalidIds.join(", ")} )`;
  const itemsStatement = db.prepare(ITEMS_SQL.replace("?", invalidList));

  const items: LocalItem[] = [];
  while (itemsStatement.step()) {
    const row = itemsStatement.getAsObject() as {
      id: number;
      added?: string;
      key: string;
      library: number;
      type: string;
    };

    const item: LocalItem = {
      id: row.id,
      key: row.key,
      library: row.library,
      type: row.type,
      dateAdded: row.added,
    };
    const citekey = citationKeyMap.get(`${row.library}:${row.key}`);
    if (citekey) item.citationKey = citekey;

    const tagsStatement = db.prepare(TAGS_SQL);
    tagsStatement.bind({ ":id": row.id });
    const tags: string[] = [];
    while (tagsStatement.step()) {
      const tagRow = tagsStatement.getAsObject() as { name?: string };
      if (tagRow.name) tags.push(tagRow.name);
    }
    tagsStatement.free();
    if (tags.length > 0) item.tags = tags;

    const metadataStatement = db.prepare(METADATA_SQL);
    metadataStatement.bind({ ":id": row.id });
    while (metadataStatement.step()) {
      const meta = metadataStatement.getAsObject() as {
        name?: string;
        value?: string;
      };
      if (!meta.name) continue;
      (item as Record<string, string>)[meta.name] = meta.value ?? "";
    }
    metadataStatement.free();

    const creatorsStatement = db.prepare(CREATORS_SQL);
    creatorsStatement.bind({ ":id": row.id });
    const creators: string[] = [];
    while (creatorsStatement.step()) {
      const creator = creatorsStatement.getAsObject() as {
        given?: string;
        family?: string;
      };
      const name = `${creator.given || ""} ${creator.family || ""}`.trim();
      if (name) creators.push(name);
    }
    creatorsStatement.free();
    if (creators.length > 0) item.creators = creators;

    const collectionsStatement = db.prepare(COLLECTIONS_SQL);
    collectionsStatement.bind({ ":id": row.id });
    const collections: string[] = [];
    while (collectionsStatement.step()) {
      const collection = collectionsStatement.getAsObject() as { key?: string };
      if (collection.key) collections.push(collection.key);
    }
    collectionsStatement.free();
    if (collections.length > 0) item.collections = collections;

    const notesStatement = db.prepare(NOTES_SQL);
    notesStatement.bind({ ":id": row.id });
    const notes: string[] = [];
    while (notesStatement.step()) {
      const noteRow = notesStatement.getAsObject() as { note?: string };
      const text = stripNoteHtml(noteRow.note);
      if (text) notes.push(text);
    }
    notesStatement.free();
    if (notes.length > 0) item.notes = notes;

    try {
      const annotationStatement = db.prepare(ANNOTATIONS_SQL);
      annotationStatement.bind({ ":id": row.id });
      while (annotationStatement.step()) {
        const annotationRow = annotationStatement.getAsObject() as {
          text?: string;
          comment?: string;
          pageLabel?: string;
        };
        const annotationParts = [
          annotationRow.text,
          annotationRow.comment,
          annotationRow.pageLabel ? `Page ${annotationRow.pageLabel}` : "",
        ]
          .filter(Boolean)
          .join(" - ");
        const annotationText = annotationParts.trim();
        if (annotationText) notes.push(annotationText);
      }
      annotationStatement.free();
      if (notes.length > 0) item.notes = notes;
    } catch {
      // Ignore annotation lookup failures for older Zotero schemas.
    }

    items.push(item);
  }

  itemsStatement.free();

  items.sort((a, b) => {
    const aTime = a.dateAdded ? Date.parse(a.dateAdded) : 0;
    const bTime = b.dateAdded ? Date.parse(b.dateAdded) : 0;
    return bTime - aTime;
  });

  const collectionsStatement = db.prepare(ALL_COLLECTIONS_SQL);
  const collections: ZoteroCollection[] = [];
  while (collectionsStatement.step()) {
    const row = collectionsStatement.getAsObject() as {
      key?: string;
      name?: string;
      parentKey?: string;
    };
    if (!row.key || !row.name) continue;
    collections.push({
      key: row.key,
      name: row.name,
      parentCollection: row.parentKey || undefined,
    });
  }
  collectionsStatement.free();

  db.close();

  cachedItems = items;
  cachedCollections = collections;
}

async function readCache(dbPath: string) {
  const cachePath = path.join(environment.supportPath, CACHE_FILENAME);
  const cacheBuffer = await readFile(cachePath);
  const cached = JSON.parse(cacheBuffer.toString()) as {
    version: number;
    zoteroPath: string;
    collections: ZoteroCollection[];
    items: LocalItem[];
  };

  if (cached.version !== CACHE_VERSION || cached.zoteroPath !== dbPath) {
    throw new Error("Invalid cache.");
  }

  cachedItems = cached.items;
  cachedCollections = cached.collections;
}

async function writeCache(dbPath: string) {
  const cachePath = path.join(environment.supportPath, CACHE_FILENAME);
  const payload = {
    version: CACHE_VERSION,
    zoteroPath: dbPath,
    collections: cachedCollections,
    items: cachedItems,
  };
  await writeFile(cachePath, JSON.stringify(payload));
}

async function ensureCache(dbPath: string, cachePeriodMinutes: number) {
  const resolved = resolveHome(dbPath);
  const stats = await stat(resolved);
  if (
    cachedDbPath === resolved &&
    cachedMtime === stats.mtimeMs &&
    cachedItems.length > 0
  ) {
    return;
  }

  cachedDbPath = resolved;
  cachedMtime = stats.mtimeMs;
  cachedItems = [];
  cachedCollections = [];
  await mkdir(environment.supportPath, { recursive: true });

  const cachePath = path.join(environment.supportPath, CACHE_FILENAME);
  if (cachePeriodMinutes > 0) {
    try {
      const cacheStats = await stat(cachePath);
      const now = Date.now();
      const cacheFresh =
        now - cacheStats.mtimeMs < cachePeriodMinutes * 60 * 1000;
      const dbUnchanged = stats.mtimeMs <= cacheStats.mtimeMs;
      if (cacheFresh && dbUnchanged) {
        await readCache(resolved);
        return;
      }
    } catch {
      // Cache missing or invalid; rebuild below.
    }
  }

  await loadData(resolved);
  if (cachePeriodMinutes > 0) {
    await writeCache(resolved);
  }
}

function parseQuery(q: string) {
  const queryItems = q.split(" ");
  const qs = queryItems.filter((c) => !c.startsWith("."));
  const ts = queryItems.filter((c) => c.startsWith("."));
  const qss = qs.join(" ").trim();
  const tss = ts.map((x) => x.substring(1)).filter(Boolean);
  return { qss, tss };
}

function stripNoteHtml(note?: string): string {
  return note?.trim() || "";
}

function mapItemToZotero(item: LocalItem): ZoteroItem {
  return {
    key: item.key,
    version: 0,
    data: {
      key: item.key,
      version: 0,
      itemType: item.type || "document",
      title: item.title || "Untitled",
      creators: (item.creators || []).map((creator) => ({
        creatorType: "author",
        name: creator,
      })),
      date: item.date || "",
      publicationTitle: item.publicationTitle || "",
      url: item.url || "",
      DOI: item.DOI || "",
      abstractNote: item.abstractNote || "",
      dateAdded: item.dateAdded || "",
      extra: item.extra || "",
      publisher: item.publisher || "",
      institution: item.institution || "",
      archive: item.archive || "",
      repository: item.repository || "",
      citationKey: item.citationKey || "",
      notes: item.notes || [],
      tags: (item.tags || []).map((tag) => ({ tag })),
      libraryId: item.library,
      collections: item.collections || [],
    },
  };
}

export function resolveZoteroDbPath(value?: string): string {
  const trimmed = (value || "").trim();
  return resolveHome(trimmed || "~/Zotero/zotero.sqlite");
}

export async function getLocalCollections(
  dbPath: string,
  cachePeriodMinutes = 0,
): Promise<ZoteroCollection[]> {
  await ensureCache(dbPath, cachePeriodMinutes);
  return cachedCollections;
}

export async function searchLocalItems(
  dbPath: string,
  query: string,
  limit: number,
  collectionKey?: string | null,
  cachePeriodMinutes = 0,
): Promise<ZoteroItem[]> {
  await ensureCache(dbPath, cachePeriodMinutes);

  let items = cachedItems;
  if (collectionKey) {
    items = items.filter((item) => item.collections?.includes(collectionKey));
  }

  if (!query.trim()) {
    return items.slice(0, limit).map(mapItemToZotero);
  }

  const { qss, tss } = parseQuery(query);

  const options = {
    isCaseSensitive: false,
    includeScore: false,
    shouldSort: true,
    includeMatches: false,
    findAllMatches: true,
    minMatchCharLength: 2,
    threshold: 0.1,
    ignoreLocation: true,
    keys: [
      { name: "title", weight: 10 },
      { name: "abstractNote", weight: 5 },
      { name: "tags", weight: 15 },
      { name: "date", weight: 3 },
      { name: "creators", weight: 4 },
      { name: "DOI", weight: 10 },
      { name: "citationKey", weight: 12 },
    ],
  };

  const fuse = new Fuse(items, options);
  if (!qss && tss.length === 0) {
    return items.slice(0, limit).map(mapItemToZotero);
  }

  const queryExpression: {
    $and: Array<{
      $or?: Array<Record<string, string>>;
      $and?: Array<Record<string, string>>;
    }>;
  } = {
    $and: qss
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => ({
        $or: options.keys.map((key) => ({
          [key.name]: token.replace(/\+/gi, " "),
        })),
      })),
  };

  if (tss.length > 0) {
    queryExpression.$and.push({
      $and: tss.map((tag) => ({ tags: tag.replace(/\+/gi, " ") })),
    });
  }

  return fuse
    .search(queryExpression)
    .map((result) => mapItemToZotero(result.item))
    .slice(0, limit);
}
