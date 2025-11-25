import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Image,
  List,
  Toast,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import type { Database } from "sql.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { expandTilde, pathExists } from "./utils/fs";
import { extractErrorMessage } from "./utils/errors";
import { findColumn, getSqlInstance, quoteIdentifier } from "./utils/sql";

type Preferences = {
  catalogPath?: string;
  fuzzyThreshold?: string;
  openScheme: "logosres" | "logos4";
};

type ResourceCover =
  | {
      type: "file";
      path: string;
    }
  | {
      type: "url";
      url: string;
    };

type ResourceRow = {
  id: string;
  title: string;
  author?: string | null;
  abbrev?: string | null;
  cover?: ResourceCover;
};

type State = {
  resources: ResourceRow[];
  dbPath?: string;
  isLoading: boolean;
  error?: string;
};

type CachePayload = {
  dbPath: string;
  mtimeMs: number;
  resources: ResourceRow[];
};

type CatalogInfo = {
  path: string;
  mtimeMs: number;
};

type ResourceTableInfo = {
  tableName: string;
  idColumn: string;
  titleColumn: string;
  authorColumn?: string;
  abbrevColumn?: string;
  recordIdColumn?: string;
};

const CACHE_FILENAME = "catalog-cache.json";
const RESOURCE_TABLE_CANDIDATES = ["Resource", "Resources", "LibraryCatalog", "Catalog", "LibraryResources"];
const ID_COLUMN_CANDIDATES = ["resourceid", "resource_id", "res_id", "id"];
const TITLE_COLUMN_CANDIDATES = ["title", "name", "displayname", "resourcetitle"];
const AUTHOR_COLUMN_CANDIDATES = ["author", "authors", "creator", "authorname"];
const ABBREV_COLUMN_CANDIDATES = ["abbreviation", "abbrev", "shorttitle", "resourceabbreviation"];
const RECORD_ID_COLUMN_CANDIDATES = ["recordid", "record_id"];
const COVER_CACHE_DIR = "covers";
const COVER_WRITE_BATCH_SIZE = 50;

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [state, setState] = useState<State>({ resources: [], isLoading: true });
  const [searchText, setSearchText] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);

  const threshold = useMemo(() => {
    const value = Number(preferences.fuzzyThreshold);
    return Number.isFinite(value) ? value : 0.3;
  }, [preferences.fuzzyThreshold]);

  const fuse = useMemo(() => {
    if (state.resources.length === 0) {
      return undefined;
    }

    return new Fuse(state.resources, {
      keys: [
        { name: "title", weight: 0.6 },
        { name: "author", weight: 0.25 },
        { name: "abbrev", weight: 0.1 },
        { name: "id", weight: 0.05 },
      ],
      threshold,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [state.resources, threshold]);

  const filteredResources = useMemo(() => {
    if (!state.resources.length) {
      return [];
    }

    const query = searchText.trim();
    if (!query) {
      return state.resources.slice(0, 50);
    }

    if (!fuse) {
      return [];
    }

    return fuse
      .search(query)
      .map((entry) => entry.item)
      .slice(0, 50);
  }, [fuse, searchText, state.resources]);

  const rebuildIndex = useCallback(
    async (forceRefresh = false) => {
      setIsIndexing(true);
      setState((previous) => ({ ...previous, isLoading: !forceRefresh && previous.resources.length === 0 }));

      const toast = await showToast({ style: Toast.Style.Animated, title: "Indexing library…" });

      try {
        const catalog = await loadCatalog(preferences, forceRefresh);
        setState({ resources: catalog.resources, dbPath: catalog.dbPath, isLoading: false });
        toast.style = Toast.Style.Success;
        toast.title = "Library indexed";
        toast.message = undefined;
      } catch (error) {
        const message = extractErrorMessage(error);
        showFailureToast({ title: "Indexing failed", message });
        setState({ resources: [], isLoading: false, error: message });
      } finally {
        setIsIndexing(false);
      }
    },
    [preferences],
  );

  useEffect(() => {
    rebuildIndex();
  }, [rebuildIndex]);

  const openResource = useCallback(
    async (resourceId: string) => {
      const logosResUrl = `logosres:${resourceId}`;
      const logos4Url = `logos4:Open?resource=${encodeURIComponent(resourceId)}`;
      const primaryFirst = preferences.openScheme === "logos4" ? [logos4Url, logosResUrl] : [logosResUrl, logos4Url];
      let lastError: unknown;

      for (const url of primaryFirst) {
        try {
          await open(url);
          await showHUD("Opening in Logos");
          return;
        } catch (error) {
          lastError = error;
        }
      }

      showFailureToast({
        title: "Could not open Logos",
        message: `${extractErrorMessage(lastError)} — Tried ${primaryFirst.join(", ")}`,
      });
    },
    [preferences.openScheme],
  );

  const copyUri = useCallback(async (resourceId: string) => Clipboard.copy(`logosres:${resourceId}`), []);

  const listIsLoading = state.isLoading || isIndexing;
  const showEmptyView = !listIsLoading && filteredResources.length === 0;

  return (
    <List
      isLoading={listIsLoading}
      searchBarPlaceholder="Search titles, authors, or abbreviations"
      throttle
      onSearchTextChange={setSearchText}
    >
      {showEmptyView ? (
        <List.EmptyView
          icon={state.error ? Icon.ExclamationMark : Icon.TextDocument}
          title={state.error ? "No resources indexed" : "No results"}
          description={state.error ?? "Try a different search term or rebuild the index."}
          actions={
            <ActionPanel>
              <Action title="Rebuild Index" icon={Icon.ArrowClockwise} onAction={() => rebuildIndex(true)} />
              {state.dbPath ? (
                <Action.Open title="Reveal Catalog DB" target={state.dbPath} application="Finder" />
              ) : undefined}
            </ActionPanel>
          }
        />
      ) : (
        filteredResources.map((resource) => (
          <List.Item
            key={resource.id}
            title={resource.title}
            subtitle={resource.author ?? undefined}
            accessoryTitle={resource.abbrev ?? resource.id}
            icon={getResourceIcon(resource)}
            actions={
              <ActionPanel>
                <Action title="Open in Logos" icon={Icon.AppWindow} onAction={() => openResource(resource.id)} />
                <Action title="Copy Logosres URI" icon={Icon.Clipboard} onAction={() => copyUri(resource.id)} />
                <Action title="Rebuild Index" icon={Icon.ArrowClockwise} onAction={() => rebuildIndex(true)} />
                {state.dbPath ? (
                  <Action.Open title="Reveal Catalog DB" target={state.dbPath} application="Finder" />
                ) : undefined}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function getResourceIcon(resource: ResourceRow): Image.ImageLike {
  if (!resource.cover) {
    return Icon.Book;
  }

  if (resource.cover.type === "file") {
    return { source: resource.cover.path, mask: Image.Mask.RoundedRectangle, fallback: Icon.Book };
  }

  return { source: resource.cover.url, mask: Image.Mask.RoundedRectangle, fallback: Icon.Book };
}

async function loadCatalog(preferences: Preferences, forceRefresh: boolean) {
  const catalogInfo = await resolveCatalog(preferences);
  const cachePath = path.join(environment.supportPath, CACHE_FILENAME);
  const coversDir = path.join(environment.supportPath, COVER_CACHE_DIR);

  if (!forceRefresh) {
    const cached = await readCache(cachePath);
    const coversReady = await coversAreReady(cached?.resources, coversDir);
    if (cached && cached.dbPath === catalogInfo.path && cached.mtimeMs === catalogInfo.mtimeMs && coversReady) {
      return { resources: cached.resources, dbPath: catalogInfo.path };
    }
  }

  const resources = await readCatalogDatabase(catalogInfo.path, coversDir);
  await writeCache(cachePath, {
    dbPath: catalogInfo.path,
    mtimeMs: catalogInfo.mtimeMs,
    resources,
  });

  return { resources, dbPath: catalogInfo.path };
}

async function coversAreReady(resources: ResourceRow[] | undefined, coversDir: string) {
  if (!resources) {
    return true;
  }

  const needsCovers = resources.some((resource) => resource.cover?.type === "file");
  if (!needsCovers) {
    return true;
  }

  return pathExists(coversDir);
}

async function resolveCatalog(preferences: Preferences): Promise<CatalogInfo> {
  const override = preferences.catalogPath?.trim();
  if (override) {
    const fullPath = expandTilde(override);
    if (!(await pathExists(fullPath))) {
      throw new Error(`catalog.db not found at ${fullPath}`);
    }
    const stats = await fs.stat(fullPath);
    return { path: fullPath, mtimeMs: stats.mtimeMs };
  }

  const baseDir = path.join(os.homedir(), "Library", "Application Support", "Logos4", "Data");
  if (!(await pathExists(baseDir))) {
    throw new Error(
      "catalog.db not found. Launch Logos once, then try again. You may need to grant Raycast Full Disk Access.",
    );
  }

  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const candidates: CatalogInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = path.join(baseDir, entry.name, "LibraryCatalog", "catalog.db");
    if (await pathExists(candidate)) {
      const stats = await fs.stat(candidate);
      candidates.push({ path: candidate, mtimeMs: stats.mtimeMs });
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      "catalog.db not found. Launch Logos once, then try again. You may need to grant Raycast Full Disk Access.",
    );
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0];
}

async function readCatalogDatabase(dbPath: string, coversDir: string): Promise<ResourceRow[]> {
  const SQL = await getSqlInstance();
  const file = await fs.readFile(dbPath);
  const database = new SQL.Database(new Uint8Array(file));

  try {
    const tableInfo = findResourceTable(database);
    const covers = await buildCoverMap(database, coversDir);
    const rows = queryResources(database, tableInfo, covers);
    return rows;
  } finally {
    database.close();
  }
}

async function buildCoverMap(database: Database, coversDir: string): Promise<Map<number, ResourceCover>> {
  const hasImagesTable = database
    .exec("SELECT name FROM sqlite_master WHERE type='table' AND lower(name)='images' LIMIT 1")
    .some((result) => result.values.length);
  if (!hasImagesTable) {
    return new Map();
  }

  await fs.rm(coversDir, { recursive: true, force: true });
  await fs.mkdir(coversDir, { recursive: true });

  const query = "SELECT RecordId AS recordId, ImageUri AS imageUri, Image AS image FROM Images";
  const result = database.exec(query);
  if (!result.length) {
    return new Map();
  }

  const [records] = result;
  const recordIdIndex = records.columns.indexOf("recordId");
  const imageUriIndex = records.columns.indexOf("imageUri");
  const imageIndex = records.columns.indexOf("image");
  if (recordIdIndex === -1) {
    return new Map();
  }

  const covers = new Map<number, ResourceCover>();
  const pendingWrites: Promise<void>[] = [];

  for (const row of records.values as (string | number | Uint8Array | null)[][]) {
    const rawRecordId = row[recordIdIndex];
    const recordId =
      typeof rawRecordId === "number" ? rawRecordId : typeof rawRecordId === "string" ? Number(rawRecordId) : undefined;
    if (!recordId || Number.isNaN(recordId)) {
      continue;
    }

    const blob = imageIndex >= 0 ? row[imageIndex] : undefined;
    if (blob instanceof Uint8Array && blob.length > 0) {
      const extension = detectImageExtension(blob);
      const filePath = path.join(coversDir, `${recordId}${extension}`);
      covers.set(recordId, { type: "file", path: filePath });
      const writePromise = writeCoverFile(filePath, blob).catch((error) => {
        console.error(`Failed to write cover for record ${recordId}`, error);
        covers.delete(recordId);
      }) as Promise<void>;
      pendingWrites.push(writePromise);

      if (pendingWrites.length >= COVER_WRITE_BATCH_SIZE) {
        await Promise.allSettled(pendingWrites);
        pendingWrites.length = 0;
      }
      continue;
    }

    const uriValue = imageUriIndex >= 0 ? row[imageUriIndex] : undefined;
    if (typeof uriValue === "string" && uriValue.trim().length > 0) {
      covers.set(recordId, { type: "url", url: uriValue });
    }
  }

  if (pendingWrites.length) {
    await Promise.allSettled(pendingWrites);
  }

  return covers;
}

function detectImageExtension(blob: Uint8Array): string {
  if (blob.length >= 4) {
    if (blob[0] === 0xff && blob[1] === 0xd8) {
      return ".jpg";
    }
    if (blob[0] === 0x89 && blob[1] === 0x50 && blob[2] === 0x4e && blob[3] === 0x47) {
      return ".png";
    }
    if (blob[0] === 0x47 && blob[1] === 0x49 && blob[2] === 0x46) {
      return ".gif";
    }
  }
  return ".img";
}

function parseRecordId(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

async function writeCoverFile(filePath: string, blob: Uint8Array) {
  const buffer = Buffer.from(blob);

  try {
    await fs.writeFile(filePath, buffer);
    return;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}

function findResourceTable(database: Database) {
  const tablesResult = database.exec("SELECT name FROM sqlite_master WHERE type='table'");
  const tableNames = new Set<string>();
  for (const table of tablesResult) {
    for (const value of table.values) {
      if (value[0]) {
        tableNames.add(String(value[0]));
      }
    }
  }

  const orderedTables = [...RESOURCE_TABLE_CANDIDATES, ...tableNames];

  for (const tableName of orderedTables) {
    if (!tableNames.has(tableName) && !RESOURCE_TABLE_CANDIDATES.includes(tableName)) {
      continue;
    }

    const pragma = database.exec(`PRAGMA table_info(${quoteIdentifier(tableName)})`);
    if (!pragma.length) {
      continue;
    }

    const columns = pragma[0].values.map((row) => String(row[1]));
    const idColumn = findColumn(columns, ID_COLUMN_CANDIDATES);
    const titleColumn = findColumn(columns, TITLE_COLUMN_CANDIDATES);
    if (!idColumn || !titleColumn) {
      continue;
    }
    const authorColumn = findColumn(columns, AUTHOR_COLUMN_CANDIDATES);
    const abbrevColumn = findColumn(columns, ABBREV_COLUMN_CANDIDATES);
    const recordIdColumn = findColumn(columns, RECORD_ID_COLUMN_CANDIDATES);

    return {
      tableName,
      idColumn,
      titleColumn,
      authorColumn,
      abbrevColumn,
      recordIdColumn,
    };
  }

  throw new Error("Could not find a resource table inside catalog.db");
}

function queryResources(
  database: Database,
  columns: ResourceTableInfo,
  covers: Map<number, ResourceCover>,
): ResourceRow[] {
  const selectColumns = [
    `${quoteIdentifier(columns.idColumn)} AS id`,
    `${quoteIdentifier(columns.titleColumn)} AS title`,
  ];

  if (columns.authorColumn) {
    selectColumns.push(`${quoteIdentifier(columns.authorColumn)} AS author`);
  }

  if (columns.abbrevColumn) {
    selectColumns.push(`${quoteIdentifier(columns.abbrevColumn)} AS abbrev`);
  }

  if (columns.recordIdColumn) {
    selectColumns.push(`${quoteIdentifier(columns.recordIdColumn)} AS recordId`);
  }

  const query = `SELECT ${selectColumns.join(", ")} FROM ${quoteIdentifier(columns.tableName)} WHERE ${quoteIdentifier(columns.idColumn)} IS NOT NULL AND ${quoteIdentifier(columns.titleColumn)} IS NOT NULL`;
  const result = database.exec(query);
  if (!result.length) {
    return [];
  }

  const columnNames = result[0].columns;
  const items: ResourceRow[] = [];
  const seen = new Set<string>();

  for (const row of result[0].values as (string | number | Uint8Array | null)[][]) {
    const record: Partial<ResourceRow> = {};
    let rawRecordId: unknown;

    for (let index = 0; index < columnNames.length; index += 1) {
      const columnName = columnNames[index];
      const value = row[index];
      if (value === null || value === undefined) {
        continue;
      }

      switch (columnName) {
        case "recordId":
          rawRecordId = value;
          break;
        case "id":
        case "title":
        case "author":
        case "abbrev":
          record[columnName] = typeof value === "string" ? value : String(value);
          break;
        default:
          break;
      }
    }

    if (!record.id || !record.title) {
      continue;
    }

    if (seen.has(record.id)) {
      continue;
    }

    seen.add(record.id);
    const recordId = parseRecordId(rawRecordId);
    items.push({
      id: record.id,
      title: record.title,
      author: record.author ?? null,
      abbrev: record.abbrev ?? null,
      cover: recordId ? covers.get(recordId) : undefined,
    });
  }

  items.sort((a, b) => a.title.localeCompare(b.title));
  return items;
}

async function readCache(cachePath: string): Promise<CachePayload | undefined> {
  try {
    const contents = await fs.readFile(cachePath, "utf8");
    const parsed = JSON.parse(contents) as CachePayload;
    if (Array.isArray(parsed.resources) && typeof parsed.dbPath === "string" && typeof parsed.mtimeMs === "number") {
      return parsed;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to read cache", error);
    }
  }
  return undefined;
}

async function writeCache(cachePath: string, payload: CachePayload) {
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(payload), "utf8");
  } catch (error) {
    console.error("Failed to write cache", error);
  }
}
