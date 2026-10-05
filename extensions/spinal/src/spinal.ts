import { Cache, getPreferenceValues } from "@raycast/api";

const cache = new Cache({ namespace: "spinal" });

const collectionsCacheKey = "collections";
const collectionsCacheDurationMilliseconds = 60 * 60 * 1000;
const resourcesCacheDurationMilliseconds = 10 * 60 * 1000;
const requestTimeoutMilliseconds = 30_000;
const collectionsPageLimit = 100;

const appBaseUrl = "https://app.spinalcms.com";

export const defaultCollectionKey = "spinal.defaultCollection";
export const lastCollectionKey = "spinal.lastCollection";

export const resourceStatusFilters = [
  "all",
  "draft",
  "scheduled",
  "published",
] as const;
export type ResourceStatusFilter = (typeof resourceStatusFilters)[number];

interface CacheEntry<T> {
  cachedAt: number;
  data: T;
}

export interface Preferences {
  apiKey: string;
}

export interface Field {
  id: string;
  key: string;
  field_type: string;
  label?: string;
  description?: string;
  required: boolean;
  read_only: boolean;
  default?: boolean;
  default_value?: string;
  min_length?: number;
  max_length?: number;
  allowed_values?: string[] | null;
}

export interface Collection {
  id: string;
  name: string;
  status: string;
  parser: string;
  source_path: string;
  primary_column?: string;
  resource_count: number;
  fields: Field[];
}

export function primaryFieldKey(collection: Collection): string | undefined {
  const key = collection.primary_column;

  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

export interface Creator {
  id: string;
  name: string;
  email: string;
}

export interface Resource {
  id: string;
  filename: string;
  relative_path: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  creator?: Creator;
  field_values?: Record<string, unknown>;
  body?: string;
  anchor?: string;
}

export interface Pagination {
  count: number;
  page: number;
  limit: number;
  last: number;
  from?: number;
  to?: number;
  next_url?: string | null;
}

export interface ListResponse<T> {
  data: T[];
  pagination?: Pagination;
}

export class SpinalError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "SpinalError";
  }
}

function preferences(): Preferences {
  const storedPreferences = getPreferenceValues<Preferences>();

  if (!storedPreferences.apiKey) {
    throw new SpinalError(0, "config_error", "API key preference is not set");
  }

  return storedPreferences;
}

async function requestJson<T>(
  path: string,
  requestInit?: RequestInit,
): Promise<T> {
  const { apiKey } = preferences();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    requestTimeoutMilliseconds,
  );

  let response: Response;

  try {
    response = await fetch(`${appBaseUrl}${path}`, {
      ...requestInit,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...requestInit?.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  let body: Record<string, unknown> = {};

  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (!response.ok) {
    const error = (body.error ?? {}) as {
      code?: string;
      message?: string;
      details?: Record<string, string[]>;
    };

    throw new SpinalError(
      response.status,
      error.code ?? "http_error",
      error.message ?? response.statusText,
      error.details,
    );
  }

  return body as T;
}

function loadCachedValue<T>(
  key: string,
  cacheDurationMilliseconds: number,
): T | undefined {
  const cached = cache.get(key);

  if (!cached) return undefined;

  try {
    const entry = JSON.parse(cached) as CacheEntry<T>;

    if (Date.now() - entry.cachedAt >= cacheDurationMilliseconds) {
      cache.remove(key);
      return undefined;
    }

    return entry.data;
  } catch {
    cache.remove(key);
    return undefined;
  }
}

function saveCachedValue<T>(key: string, data: T): void {
  cache.set(
    key,
    JSON.stringify({ cachedAt: Date.now(), data } satisfies CacheEntry<T>),
  );
}

export async function fetchCollections(): Promise<Collection[]> {
  const cached = loadCachedValue<Collection[]>(
    collectionsCacheKey,
    collectionsCacheDurationMilliseconds,
  );

  if (cached) return cached;

  const collections: Collection[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await requestJson<ListResponse<Collection>>(
      `/api/collections?limit=${collectionsPageLimit}&page=${page}`,
    );

    collections.push(...response.data);
    lastPage = response.pagination?.last ?? page;
    page += 1;
  } while (page <= lastPage);

  saveCachedValue(collectionsCacheKey, collections);
  return collections;
}

export interface ResourceQuery {
  status?: ResourceStatusFilter;
  page?: number;
  limit?: number;
}

export async function fetchResources(
  collectionId: string,
  query: ResourceQuery = {},
): Promise<ListResponse<Resource>> {
  const queryParameters = new URLSearchParams();

  if (query.status && query.status !== "all")
    queryParameters.set("status", query.status);
  if (query.page) queryParameters.set("page", String(query.page));
  if (query.limit) queryParameters.set("limit", String(query.limit));

  const queryString = queryParameters.toString();

  return requestJson<ListResponse<Resource>>(
    `/api/collections/${encodeURIComponent(collectionId)}/resources${
      queryString ? `?${queryString}` : ""
    }`,
  );
}

function resourcesCacheKey(
  collectionId: string,
  status: ResourceStatusFilter,
): string {
  return `resources:${collectionId}:${status}`;
}

export function loadCachedResources(
  collectionId: string,
  status: ResourceStatusFilter,
): ListResponse<Resource> | undefined {
  return loadCachedValue<ListResponse<Resource>>(
    resourcesCacheKey(collectionId, status),
    resourcesCacheDurationMilliseconds,
  );
}

export function cacheResources(
  collectionId: string,
  status: ResourceStatusFilter,
  response: ListResponse<Resource>,
): void {
  saveCachedValue(resourcesCacheKey(collectionId, status), response);
}

export function clearResourceCache(collectionId: string): void {
  for (const status of resourceStatusFilters) {
    cache.remove(resourcesCacheKey(collectionId, status));
  }
}

export function resourceUrl(resourceId: string): string {
  return `${appBaseUrl}/resource/${encodeURIComponent(resourceId)}/edit`;
}

export async function createResource(
  collectionId: string,
  input: {
    filename?: string;
    relative_path?: string;
    body?: string;
    published_at?: string;
    field_values?: Record<string, string>;
  },
): Promise<Record<string, unknown>> {
  const response = await requestJson<{ data: Record<string, unknown> }>(
    `/api/collections/${encodeURIComponent(collectionId)}/resources`,
    { method: "POST", body: JSON.stringify({ resource: input }) },
  );

  return response.data;
}

export function clearCache(): void {
  cache.clear();
}

export function errorTitle(error: unknown): string {
  if (error instanceof SpinalError) {
    if (error.status === 401) return "Invalid API key";
    if (error.status === 402) return "API not enabled on your plan";
    if (error.status === 422) return "Validation failed";
    if (error.status === 429) return "Rate limit exceeded";

    return `Request failed (${error.status})`;
  }

  return "Error";
}

export function errorMessage(error: unknown): string {
  if (error instanceof SpinalError) {
    if (error.details) {
      return Object.entries(error.details)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
        .join("\n");
    }

    return error.message;
  }

  return error instanceof Error ? error.message : String(error);
}

export function toSpinalError(error: unknown): SpinalError {
  return error instanceof SpinalError
    ? error
    : new SpinalError(0, "unknown_error", String(error));
}
