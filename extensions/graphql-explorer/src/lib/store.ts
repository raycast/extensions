import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useEffect, useSyncExternalStore } from "react";
import { clearSchemaCache } from "./schema";
import { GraphQLEnvironment, RawVariableValues, SavedQuery } from "./types";

/*
 * A tiny module-level store backed by Raycast's LocalStorage.
 *
 * Views pushed onto the navigation stack are not children of the command's root component, so a React
 * context would not reach them. Every view of a command shares this module instance instead and
 * subscribes to it via `useStore()`, so a change made in a pushed form is reflected everywhere at once.
 */

const ENVIRONMENTS_KEY = "environments";
const QUERIES_KEY = "queries";
const VARIABLES_KEY_PREFIX = "variables:";

interface StoreState {
  environments: GraphQLEnvironment[];
  queries: SavedQuery[];
  isLoading: boolean;
}

let state: StoreState = { environments: [], queries: [], isLoading: true };
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | undefined;

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readList<T>(key: string): Promise<T[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all([readList<GraphQLEnvironment>(ENVIRONMENTS_KEY), readList<SavedQuery>(QUERIES_KEY)])
      .then(([environments, queries]) => setState({ environments, queries, isLoading: false }))
      .catch(async (error) => {
        loadPromise = undefined;
        setState({ isLoading: false });
        await showFailureToast(error, { title: "Could not load saved data" });
        throw error;
      });
  }
  return loadPromise;
}

export function useStore(): StoreState {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    ensureLoaded().catch(() => undefined);
  }, []);
  return snapshot;
}

/*
 * Changes are written to LocalStorage first and published to the views only once the write succeeded, so a failed
 * save never shows up as done. Mutations therefore run one at a time: each starts from the state the previous one
 * published, and quick successive edits cannot overwrite each other.
 */
let mutationQueue: Promise<unknown> = Promise.resolve();

function serialized<A extends unknown[], T>(mutation: (...args: A) => Promise<T>): (...args: A) => Promise<T> {
  return (...args) => {
    const result = mutationQueue.then(() => mutation(...args));
    mutationQueue = result.catch(() => undefined);
    return result;
  };
}

async function persistEnvironments(environments: GraphQLEnvironment[]) {
  await LocalStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(environments));
  setState({ environments });
}

async function persistQueries(queries: SavedQuery[]) {
  await LocalStorage.setItem(QUERIES_KEY, JSON.stringify(queries));
  setState({ queries });
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

// Environments ---------------------------------------------------------------------------------------------------

export type EnvironmentInput = Pick<GraphQLEnvironment, "name" | "url" | "headers">;

export const saveEnvironment = serialized(async (input: EnvironmentInput, id?: string): Promise<GraphQLEnvironment> => {
  await ensureLoaded();
  const now = Date.now();
  const existing = id ? state.environments.find((env) => env.id === id) : undefined;
  if (existing) {
    const updated: GraphQLEnvironment = { ...existing, ...input, updatedAt: now };
    await persistEnvironments(state.environments.map((env) => (env.id === id ? updated : env)));
    if (existing.url !== updated.url || JSON.stringify(existing.headers) !== JSON.stringify(updated.headers)) {
      await clearSchemaCache(existing);
    }
    return updated;
  }
  const created: GraphQLEnvironment = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
  await persistEnvironments([...state.environments, created].sort(byName));
  return created;
});

export const deleteEnvironment = serialized(async (id: string): Promise<void> => {
  await ensureLoaded();
  const env = state.environments.find((item) => item.id === id);
  await persistEnvironments(state.environments.filter((item) => item.id !== id));
  // Queries pointing at the removed environment become "unassigned" instead of dangling.
  if (state.queries.some((query) => query.environmentId === id)) {
    await persistQueries(
      state.queries.map((query) => (query.environmentId === id ? { ...query, environmentId: undefined } : query)),
    );
  }
  if (env) await clearSchemaCache(env);
});

// Queries --------------------------------------------------------------------------------------------------------

export type QueryInput = Pick<SavedQuery, "name" | "query" | "environmentId" | "icon" | "iconColor">;

export const saveQuery = serialized(async (input: QueryInput, id?: string): Promise<SavedQuery> => {
  await ensureLoaded();
  const now = Date.now();
  const existing = id ? state.queries.find((query) => query.id === id) : undefined;
  if (existing) {
    const updated: SavedQuery = { ...existing, ...input, updatedAt: now };
    await persistQueries(state.queries.map((query) => (query.id === id ? updated : query)));
    return updated;
  }
  const created: SavedQuery = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
  await persistQueries([...state.queries, created].sort(byName));
  return created;
});

/** Not serialized itself: it queues through `saveQuery`, which would otherwise wait behind it forever. */
export async function duplicateQuery(id: string): Promise<SavedQuery | undefined> {
  await ensureLoaded();
  const source = state.queries.find((query) => query.id === id);
  if (!source) return undefined;
  const copy = await saveQuery({ ...source, name: `${source.name} Copy` });
  const variables = await getSavedVariables(source.id);
  if (Object.keys(variables).length > 0) await setSavedVariables(copy.id, variables);
  return copy;
}

export const deleteQuery = serialized(async (id: string): Promise<void> => {
  await ensureLoaded();
  await persistQueries(state.queries.filter((query) => query.id !== id));
  await LocalStorage.removeItem(VARIABLES_KEY_PREFIX + id);
});

// Last used variable values --------------------------------------------------------------------------------------

export async function getSavedVariables(queryId: string): Promise<RawVariableValues> {
  const raw = await LocalStorage.getItem<string>(VARIABLES_KEY_PREFIX + queryId);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as RawVariableValues) : {};
  } catch {
    return {};
  }
}

export async function setSavedVariables(queryId: string, values: RawVariableValues): Promise<void> {
  await LocalStorage.setItem(VARIABLES_KEY_PREFIX + queryId, JSON.stringify(values));
}
