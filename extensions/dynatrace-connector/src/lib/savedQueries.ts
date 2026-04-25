// src/lib/savedQueries.ts
// CRUD operations for saved DQL queries.
// Stored in LocalStorage (non-synced for privacy).

import { LocalStorage } from "@raycast/api";
import { z } from "zod";
import { SavedQuery, savedQuerySchema } from "./types/savedQuery";

const STORAGE_KEY = "saved-queries:v1";

/**
 * List all saved queries, optionally filtered by tenant.
 */
export async function listSavedQueries(tenantId?: string): Promise<SavedQuery[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const queries = z.array(savedQuerySchema).parse(parsed);
    return tenantId ? queries.filter((q) => !q.tenantId || q.tenantId === tenantId) : queries;
  } catch {
    return [];
  }
}

/**
 * Save a new query or update an existing one.
 */
export async function saveSavedQuery(
  query: Omit<SavedQuery, "id" | "createdAt">,
  overrideId?: string,
): Promise<SavedQuery> {
  const queries = await listSavedQueries();
  const id = overrideId || `query-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  const newQuery: SavedQuery = {
    id,
    createdAt,
    ...query,
  };

  // Validate with schema
  const validated = savedQuerySchema.parse(newQuery);

  // Check if exists
  const existing = queries.find((q) => q.id === id);
  if (existing) {
    const idx = queries.indexOf(existing);
    queries[idx] = validated;
  } else {
    queries.push(validated);
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
  return validated;
}

/**
 * Delete a saved query by ID.
 */
export async function deleteSavedQuery(id: string): Promise<void> {
  const queries = await listSavedQueries();
  const filtered = queries.filter((q) => q.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Toggle favorite status of a saved query.
 */
export async function toggleFavorite(id: string): Promise<void> {
  const queries = await listSavedQueries();
  const query = queries.find((q) => q.id === id);
  if (query) {
    query.isFavorite = !query.isFavorite;
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
  }
}

/**
 * Get a single saved query by ID.
 */
export async function getSavedQuery(id: string): Promise<SavedQuery | null> {
  const queries = await listSavedQueries();
  return queries.find((q) => q.id === id) || null;
}

/**
 * Get favorite queries only.
 */
export async function getFavoriteSavedQueries(tenantId?: string): Promise<SavedQuery[]> {
  const queries = await listSavedQueries(tenantId);
  return queries.filter((q) => q.isFavorite);
}
