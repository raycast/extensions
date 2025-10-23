import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Toast,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

type Preferences = {
  catalogPath?: string;
  fuzzyThreshold?: string;
  openScheme: "logosres" | "logos4";
};

type ResourceRow = {
  id: string;
  title: string;
  author?: string | null;
  abbrev?: string | null;
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

const CACHE_FILENAME = "catalog-cache.json";
const RESOURCE_TABLE_CANDIDATES = ["Resource", "Resources", "LibraryCatalog", "Catalog", "LibraryResources"];
const ID_COLUMN_CANDIDATES = ["resourceid", "resource_id", "res_id", "id"];
const TITLE_COLUMN_CANDIDATES = ["title", "name", "displayname", "resourcetitle"];
const AUTHOR_COLUMN_CANDIDATES = ["author", "authors", "creator", "authorname"];
const ABBREV_COLUMN_CANDIDATES = ["abbreviation", "abbrev", "shorttitle", "resourceabbreviation"];

let sqlInstancePromise: Promise<SqlJsStatic> | undefined;

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
        toast.style = Toast.Style.Failure;
        toast.title = "Indexing failed";
        toast.message = message;
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

      await showToast({
        style: Toast.Style.Failure,
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
            icon={Icon.Book}
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

async function loadCatalog(preferences: Preferences, forceRefresh: boolean) {
  const catalogInfo = await resolveCatalog(preferences);
  const cachePath = path.join(environment.supportPath, CACHE_FILENAME);

  if (!forceRefresh) {
    const cached = await readCache(cachePath);
    if (cached && cached.dbPath === catalogInfo.path && cached.mtimeMs === catalogInfo.mtimeMs) {
      return { resources: cached.resources, dbPath: catalogInfo.path };
    }
  }

  const resources = await readCatalogDatabase(catalogInfo.path);
  await writeCache(cachePath, {
    dbPath: catalogInfo.path,
    mtimeMs: catalogInfo.mtimeMs,
    resources,
  });

  return { resources, dbPath: catalogInfo.path };
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

async function readCatalogDatabase(dbPath: string): Promise<ResourceRow[]> {
  const SQL = await getSqlInstance();
  const file = await fs.readFile(dbPath);
  const database = new SQL.Database(new Uint8Array(file));

  try {
    const tableInfo = findResourceTable(database);
    const rows = queryResources(database, tableInfo);
    return rows;
  } finally {
    database.close();
  }
}

async function getSqlInstance(): Promise<SqlJsStatic> {
  if (!sqlInstancePromise) {
    sqlInstancePromise = initSqlJs({ locateFile: (file: string) => path.join(environment.assetsPath, file) });
  }
  return sqlInstancePromise;
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

    return {
      tableName,
      idColumn,
      titleColumn,
      authorColumn,
      abbrevColumn,
    };
  }

  throw new Error("Could not find a resource table inside catalog.db");
}

function queryResources(
  database: Database,
  columns: { tableName: string; idColumn: string; titleColumn: string; authorColumn?: string; abbrevColumn?: string },
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
    columnNames.forEach((columnName: string, index: number) => {
      const key = columnName as keyof ResourceRow;
      const value = row[index];
      if (value === null || value === undefined) {
        return;
      }
      record[key] = typeof value === "string" ? value : String(value);
    });

    if (!record.id || !record.title) {
      continue;
    }

    if (seen.has(record.id)) {
      continue;
    }

    seen.add(record.id);
    items.push({
      id: record.id,
      title: record.title,
      author: record.author ?? null,
      abbrev: record.abbrev ?? null,
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

function findColumn(columns: string[], candidates: string[]): string | undefined {
  const lowerCaseColumns = columns.map((column) => column.toLowerCase());
  for (const candidate of candidates) {
    const index = lowerCaseColumns.indexOf(candidate);
    if (index >= 0) {
      return columns[index];
    }
  }
  return undefined;
}

function quoteIdentifier(identifier: string): string {
  const escaped = identifier.replace(/"/g, '""');
  return `"${escaped}"`;
}

function expandTilde(input: string): string {
  if (!input.startsWith("~")) {
    return input;
  }
  return path.join(os.homedir(), input.slice(1));
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
