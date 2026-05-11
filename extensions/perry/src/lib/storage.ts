import { LocalStorage } from "@raycast/api";
import { Database, QueryHistory, SavedQuery } from "./types";

const DATABASES_KEY = "databases";
const QUERY_HISTORY_KEY = "queryHistory";
const SAVED_QUERIES_KEY = "savedQueries";
const ACTIVE_DATABASE_KEY = "activeDatabase";

export async function getDatabases(): Promise<Database[]> {
  const stored = await LocalStorage.getItem<string>(DATABASES_KEY);
  return stored ? JSON.parse(stored) : [];
}

async function saveDatabases(databases: Database[]): Promise<void> {
  await LocalStorage.setItem(DATABASES_KEY, JSON.stringify(databases));
}

export async function addDatabase(database: Database): Promise<void> {
  const databases = await getDatabases();
  databases.push(database);
  await saveDatabases(databases);
}

export async function updateDatabase(id: string, updates: Partial<Database>): Promise<void> {
  const databases = await getDatabases();
  const index = databases.findIndex((db) => db.id === id);
  if (index !== -1) {
    databases[index] = { ...databases[index], ...updates };
    await saveDatabases(databases);
  }
}

export async function deleteDatabase(id: string): Promise<void> {
  const databases = await getDatabases();
  await saveDatabases(databases.filter((db) => db.id !== id));
}

export async function getActiveDatabase(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(ACTIVE_DATABASE_KEY)) || null;
}

export async function setActiveDatabase(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_DATABASE_KEY, id);
}

export async function getQueryHistory(): Promise<QueryHistory[]> {
  const stored = await LocalStorage.getItem<string>(QUERY_HISTORY_KEY);
  return stored ? JSON.parse(stored).slice(0, 20) : [];
}

export async function addQueryToHistory(query: QueryHistory): Promise<void> {
  const history = await getQueryHistory();
  history.unshift(query);
  await LocalStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export async function deleteQueryFromHistory(id: string): Promise<void> {
  const history = await getQueryHistory();
  await LocalStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history.filter((q) => q.id !== id)));
}

export async function clearQueryHistory(): Promise<void> {
  await LocalStorage.removeItem(QUERY_HISTORY_KEY);
}

export async function getSavedQueries(): Promise<SavedQuery[]> {
  const stored = await LocalStorage.getItem<string>(SAVED_QUERIES_KEY);
  return stored ? JSON.parse(stored) : [];
}

async function saveSavedQueries(queries: SavedQuery[]): Promise<void> {
  await LocalStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(queries));
}

export async function addSavedQuery(query: SavedQuery): Promise<void> {
  const queries = await getSavedQueries();
  queries.push(query);
  await saveSavedQueries(queries);
}

export async function updateSavedQuery(id: string, updates: Partial<SavedQuery>): Promise<void> {
  const queries = await getSavedQueries();
  const index = queries.findIndex((q) => q.id === id);
  if (index !== -1) {
    queries[index] = { ...queries[index], ...updates, updatedAt: new Date().toISOString() };
    await saveSavedQueries(queries);
  }
}

export async function deleteSavedQuery(id: string): Promise<void> {
  const queries = await getSavedQueries();
  await saveSavedQueries(queries.filter((q) => q.id !== id));
}
