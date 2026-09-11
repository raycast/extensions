import { Cache, getPreferenceValues } from "@raycast/api";
import { createHmac } from "crypto";
import { readFile } from "fs/promises";
import { basename } from "path";
import {
  getAccessKeyScope,
  getEffectiveAccessLevel,
  hasConfiguredWriteAccess,
  markSessionReadOnly,
} from "./access-control";
import {
  ApiProblem,
  ApiProblemSchema,
  Link,
  LinkSchema,
  MyMindObject,
  MyMindObjectSchema,
  ParsedPreferences,
  PreferencesSchema,
  Space,
  SpaceSchema,
  Tag,
  TagSchema,
} from "./types";
import { buildObjectMetadata } from "./object-payload";
import { extractCreatedObjectId, extractObjectIdFromLocationHeader } from "./create-response";
import { isReadOnlyAccessProblem } from "./error-utils";
import { getUploadMimeType } from "./save-input";

const API_BASE_URL = "https://api.mymind.com";
const USER_AGENT = "raycast-mymind/2.0";
const capabilityCache = new Cache({ namespace: "mymind-capabilities" });
export const READ_ONLY_ACCESS_MESSAGE =
  "This key is read-only. Update the extension's Access Level or use a full-access key.";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | Array<string | number | boolean> | undefined>;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  json?: unknown;
  accept?: string;
  redirect?: RequestRedirect;
};

function isWriteMethod(method: RequestOptions["method"] | undefined): boolean {
  return (method ?? "GET") !== "GET";
}

export class MyMindApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly type?: string,
  ) {
    super(message);
    this.name = "MyMindApiError";
  }
}

type SearchMatch = {
  id: string;
  score: number;
  semanticScore?: number;
};

type SearchResponse = {
  matches: SearchMatch[];
};

export function isReadOnlyWriteError(error: unknown): error is MyMindApiError {
  return (
    error instanceof MyMindApiError &&
    (error.type === "read-only-access" || (error.status === 403 && error.message === READ_ONLY_ACCESS_MESSAGE))
  );
}

export function isMissingEmbeddingError(error: unknown): error is MyMindApiError {
  return error instanceof MyMindApiError && error.message.toLowerCase().includes("does not have an embedding");
}

function getCapabilityCacheKey(kind: string): string {
  return `${kind}:${getCurrentAccessKeyScope()}`;
}

const MASTERMIND_SUCCESS_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MASTERMIND_FAILURE_TTL_MS = 1000 * 60 * 60 * 6;

type CachedMastermindCapability = {
  fetchedAt: number;
  available: boolean;
};

function readCachedMastermindCapability(): boolean | undefined {
  const raw = capabilityCache.get(getCapabilityCacheKey("mastermind-search"));

  if (!raw) {
    return undefined;
  }

  try {
    const cached = JSON.parse(raw) as CachedMastermindCapability;
    const ttl = cached.available ? MASTERMIND_SUCCESS_TTL_MS : MASTERMIND_FAILURE_TTL_MS;

    if (Date.now() - cached.fetchedAt > ttl) {
      capabilityCache.remove(getCapabilityCacheKey("mastermind-search"));
      return undefined;
    }

    return cached.available;
  } catch {
    capabilityCache.remove(getCapabilityCacheKey("mastermind-search"));
    return undefined;
  }
}

function writeCachedMastermindCapability(available: boolean) {
  capabilityCache.set(
    getCapabilityCacheKey("mastermind-search"),
    JSON.stringify({ fetchedAt: Date.now(), available } satisfies CachedMastermindCapability),
  );
}

function isMastermindFeatureUnsupported(error: unknown): error is MyMindApiError {
  if (!(error instanceof MyMindApiError)) {
    return false;
  }

  if (error.status === 403) {
    return true;
  }

  const message = error.message.toLowerCase();
  return message.includes("mastermind") || message.includes("plan") || message.includes("upgrade");
}

function getPreferences(): ParsedPreferences {
  return PreferencesSchema.parse(getPreferenceValues<Preferences>());
}

function getCurrentAccessKeyScope(): string {
  const { accessKeyId, accessKeySecret } = getPreferences();
  return getAccessKeyScope(accessKeyId, accessKeySecret);
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createBearerToken(path: string, method: string): string {
  const { accessKeyId, accessKeySecret } = getPreferences();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 300;
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", kid: accessKeyId }));
  const payload = base64UrlEncode(JSON.stringify({ path, method, iat, exp }));
  const secret = Buffer.from(accessKeySecret, "base64");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

function buildUrl(path: string, query?: RequestOptions["query"]): URL {
  const url = new URL(path, API_BASE_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === "") {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== "") {
            url.searchParams.append(key, String(item));
          }
        }

        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function createRequestHeaders(pathname: string, method: string, options?: RequestOptions): Headers {
  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${createBearerToken(pathname, method)}`);
  headers.set("User-Agent", USER_AGENT);
  headers.set("Accept", options?.accept ?? "application/json");
  return headers;
}

async function parseProblem(response: Response): Promise<ApiProblem | null> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/problem+json") && !contentType.includes("application/json")) {
    return null;
  }

  try {
    return ApiProblemSchema.parse(await response.json());
  } catch {
    return null;
  }
}

async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const method = options.method ?? "GET";
  const url = buildUrl(path, options.query);
  const headers = createRequestHeaders(url.pathname, method, options);

  let body = options.body ?? null;

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const response = await fetch(url, { method, headers, body, redirect: options.redirect });

  if (!response.ok) {
    const problem = await parseProblem(response);
    const isWriteAccessFailure = response.status === 403 && isWriteMethod(method) && isReadOnlyAccessProblem(problem);

    if (isWriteAccessFailure) {
      markSessionReadOnly(getCurrentAccessKeyScope());
    }

    throw new MyMindApiError(
      isWriteAccessFailure
        ? READ_ONLY_ACCESS_MESSAGE
        : (problem?.detail ?? `Request failed with status ${response.status}`),
      response.status,
      isWriteAccessFailure ? "read-only-access" : problem?.type,
    );
  }

  return response;
}

function parseObject(data: unknown): MyMindObject {
  return MyMindObjectSchema.parse(data);
}

async function hydrateSearchMatches(ids: string[]): Promise<MyMindObject[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const objects = await listObjects({ ids, limit: ids.length });
    const objectsById = new Map(objects.map((item) => [item.id, item]));
    const orderedObjects = ids.map((id) => objectsById.get(id)).filter((item): item is MyMindObject => Boolean(item));

    if (orderedObjects.length > 0) {
      return orderedObjects;
    }
  } catch (error) {
    if (!(error instanceof MyMindApiError) || error.status !== 403) {
      throw error;
    }
  }

  const settled = await Promise.allSettled(ids.map(async (id) => await getObject(id)));

  return settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

async function parseCreatedObjectResponse(response: Response): Promise<MyMindObject> {
  const location = response.headers.get("location") ?? response.headers.get("content-location") ?? undefined;
  const rawBody = await response.text();

  if (!rawBody.trim()) {
    const objectId = extractObjectIdFromLocationHeader(location);

    if (objectId) {
      return await getObject(objectId);
    }

    throw new MyMindApiError("Created object response was empty.", response.status);
  }

  let data: unknown;

  try {
    data = JSON.parse(rawBody);
  } catch {
    const objectId = extractObjectIdFromLocationHeader(location);

    if (objectId) {
      return await getObject(objectId);
    }

    throw new MyMindApiError("Created object response was not valid JSON.", response.status);
  }

  try {
    return parseObject(data);
  } catch (error) {
    const objectId = extractCreatedObjectId(data) ?? extractObjectIdFromLocationHeader(location);

    if (objectId) {
      return await getObject(objectId);
    }

    throw error;
  }
}

export async function listObjects(query?: {
  q?: string;
  spaceId?: string;
  limit?: number;
  ids?: string[];
  similarTo?: string;
}): Promise<MyMindObject[]> {
  const response = await request("/objects", {
    query: {
      contentAs: "text/markdown",
      limit: query?.limit ?? 200,
      q: query?.q,
      spaceId: query?.spaceId,
      id: query?.ids,
      similarTo: query?.similarTo,
    },
  });

  const data = await response.json();
  return Array.isArray(data) ? data.map(parseObject) : [];
}

export async function searchObjects(query: {
  q?: string;
  limit?: number;
  similarTo?: string;
  rerank?: boolean;
}): Promise<MyMindObject[]> {
  const response = await request("/search", {
    query: {
      q: query.q,
      limit: query.limit ?? 200,
      similarTo: query.similarTo,
      rerank: query.rerank,
    },
  });

  const data = (await response.json()) as SearchResponse;
  const matches = Array.isArray(data.matches) ? data.matches : [];

  if (matches.length === 0) {
    return [];
  }

  const ids = matches.map((match) => match.id);
  return await hydrateSearchMatches(ids);
}

export async function getObject(id: string): Promise<MyMindObject> {
  const response = await request(`/objects/${id}`, {
    query: { contentAs: "text/markdown" },
  });

  return parseObject(await response.json());
}

export async function listSpaces(): Promise<Space[]> {
  const response = await request("/spaces");
  const data = await response.json();
  return Array.isArray(data) ? data.map((item) => SpaceSchema.parse(item)) : [];
}

export async function createSpace(input: { name: string; color?: string }): Promise<Space> {
  const response = await request("/spaces", {
    method: "POST",
    json: input,
  });

  return SpaceSchema.parse(await response.json());
}

export async function updateSpace(id: string, input: { name?: string; color?: string }): Promise<Space> {
  const response = await request(`/spaces/${id}`, {
    method: "PATCH",
    json: input,
  });

  return SpaceSchema.parse(await response.json());
}

export async function deleteSpace(id: string): Promise<void> {
  await request(`/spaces/${id}`, {
    method: "DELETE",
  });
}

export async function listTags(): Promise<Tag[]> {
  const response = await request("/tags");
  const data = await response.json();
  return Array.isArray(data) ? data.map((item) => TagSchema.parse(item)) : [];
}

export async function listLinks(): Promise<Link[]> {
  const response = await request("/links");
  const data = await response.json();
  return Array.isArray(data) ? data.map((item) => LinkSchema.parse(item)) : [];
}

export function hasWriteAccess(): boolean {
  const preferences = getPreferences();
  return hasConfiguredWriteAccess(getEffectiveAccessLevel(preferences.accessLevel, getCurrentAccessKeyScope()));
}

export async function createObject(input: {
  title?: string;
  url?: string;
  content?: string;
  tags?: string[];
  spaceId?: string;
}): Promise<{ object: MyMindObject; created: boolean }> {
  const response = await request("/objects", {
    method: "POST",
    json: {
      ...buildObjectMetadata(input),
      url: input.url,
      content: input.content
        ? {
            type: "text/markdown",
            body: input.content,
          }
        : undefined,
    },
  });

  return {
    object: await parseCreatedObjectResponse(response),
    created: response.status === 201,
  };
}

export async function uploadObjectFile(input: {
  filePath: string;
  title?: string;
  tags?: string[];
  spaceId?: string;
}): Promise<{ object: MyMindObject; created: boolean }> {
  const mimeType = getUploadMimeType(input.filePath);

  if (!mimeType) {
    throw new MyMindApiError(`Unsupported file type for upload: ${basename(input.filePath)}`, 415);
  }

  const fileContents = await readFile(input.filePath);
  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(buildObjectMetadata(input))], {
      type: "application/json",
    }),
  );
  formData.append("blob", new Blob([fileContents], { type: mimeType }), basename(input.filePath));

  const response = await request("/objects", {
    method: "POST",
    body: formData,
  });

  return {
    object: await parseCreatedObjectResponse(response),
    created: response.status === 201,
  };
}

export async function pinObjectToTopOfMind(id: string, position?: number): Promise<void> {
  await request(`/objects/${id}/pin`, {
    method: "POST",
    json: position === undefined ? {} : { position },
  });
}

export async function unpinObjectFromTopOfMind(id: string): Promise<void> {
  await request(`/objects/${id}/pin`, { method: "DELETE" });
}

export async function deleteObject(id: string): Promise<void> {
  await request(`/objects/${id}`, { method: "DELETE" });
}

export async function createObjectNote(objectId: string, markdown: string): Promise<void> {
  await request(`/objects/${objectId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "text/markdown" },
    body: markdown,
    accept: "application/json",
  });
}

export async function deleteObjectNote(objectId: string, noteId: string): Promise<void> {
  await request(`/objects/${objectId}/notes/${noteId}`, {
    method: "DELETE",
  });
}

export async function updateObject(
  id: string,
  input: {
    title?: string;
    summary?: string;
    completed?: boolean;
  },
): Promise<void> {
  await request(`/objects/${id}`, {
    method: "PATCH",
    json: input,
  });
}

export async function updateObjectContent(objectId: string, markdown: string): Promise<void> {
  await request(`/objects/${objectId}/content`, {
    method: "PUT",
    headers: { "Content-Type": "text/markdown" },
    body: markdown,
    accept: "application/json",
  });
}

export async function updateObjectNote(objectId: string, noteId: string, markdown: string): Promise<void> {
  await request(`/objects/${objectId}/notes/${noteId}`, {
    method: "PUT",
    headers: { "Content-Type": "text/markdown" },
    body: markdown,
    accept: "application/json",
  });
}

export async function addTagsToObject(objectId: string, tagNames: string[]): Promise<void> {
  if (tagNames.length === 0) {
    return;
  }

  await request(`/objects/${objectId}/tags`, {
    method: "POST",
    json: tagNames.map((name) => ({ name })),
  });
}

export async function removeTagsFromObject(
  objectId: string,
  tags: Array<{ id?: string; name?: string }>,
): Promise<void> {
  const references = tags.filter((tag) => tag.id || tag.name);

  if (references.length === 0) {
    return;
  }

  await request(`/objects/${objectId}/tags`, {
    method: "DELETE",
    json: references,
  });
}

export async function addObjectToSpaces(objectId: string, spaceIds: string[]): Promise<void> {
  if (spaceIds.length === 0) {
    return;
  }

  await request(`/objects/${objectId}/spaces`, {
    method: "POST",
    json: spaceIds.map((id) => ({ id })),
  });
}

export async function removeObjectFromSpace(spaceId: string, objectId: string): Promise<void> {
  await request(`/spaces/${spaceId}/objects/${objectId}`, {
    method: "DELETE",
  });
}

export async function getObjectThumbnailUrl(id: string, size = "500x500"): Promise<string | undefined> {
  const method = "GET";
  const url = buildUrl(`/objects/${id}/thumbnail`, { size });
  const headers = createRequestHeaders(url.pathname, method, { accept: "image/*" });
  const response = await fetch(url, { method, headers, redirect: "manual" });

  if (response.status === 302) {
    return response.headers.get("location") ?? undefined;
  }

  if (response.ok) {
    return response.url;
  }

  if (response.status === 404 || response.status === 422) {
    return undefined;
  }

  const problem = await parseProblem(response);
  throw new MyMindApiError(
    problem?.detail ?? `Thumbnail request failed with status ${response.status}`,
    response.status,
    problem?.type,
  );
}

export async function getObjectThumbnailUrls(ids: string[], size = "500x500"): Promise<Record<string, string>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const url = await getObjectThumbnailUrl(id, size);
        return url ? ([id, url] as const) : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)));
}

export async function getObjectBlobUrl(id: string): Promise<string | undefined> {
  const method = "GET";
  const url = buildUrl(`/objects/${id}/blob`);
  const headers = createRequestHeaders(url.pathname, method, { accept: "*/*" });
  const response = await fetch(url, { method, headers, redirect: "manual" });

  if (response.status === 302) {
    return response.headers.get("location") ?? undefined;
  }

  if (response.ok) {
    return response.url;
  }

  if (response.status === 404 || response.status === 422) {
    return undefined;
  }

  const problem = await parseProblem(response);
  throw new MyMindApiError(
    problem?.detail ?? `Blob request failed with status ${response.status}`,
    response.status,
    problem?.type,
  );
}

export async function getObjectBlobUrls(ids: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const url = await getObjectBlobUrl(id);
        return url ? ([id, url] as const) : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)));
}

export async function getObjectScreenshotUrl(id: string): Promise<string | undefined> {
  const method = "GET";
  const url = buildUrl(`/objects/${id}/screenshot`);
  const headers = createRequestHeaders(url.pathname, method, { accept: "image/*" });
  const response = await fetch(url, { method, headers, redirect: "manual" });

  if (response.status === 302) {
    return response.headers.get("location") ?? undefined;
  }

  if (response.ok) {
    return response.url;
  }

  if (response.status === 404 || response.status === 422) {
    return undefined;
  }

  const problem = await parseProblem(response);
  throw new MyMindApiError(
    problem?.detail ?? `Screenshot request failed with status ${response.status}`,
    response.status,
    problem?.type,
  );
}

export async function getObjectScreenshotUrls(ids: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const url = await getObjectScreenshotUrl(id);
        return url ? ([id, url] as const) : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)));
}

export async function hasMastermindSearchAccess(): Promise<boolean> {
  const cached = readCachedMastermindCapability();

  if (cached !== undefined) {
    return cached;
  }

  try {
    await request("/search", {
      query: {
        q: "design",
        limit: 1,
        rerank: true,
      },
    });
    writeCachedMastermindCapability(true);
    return true;
  } catch (error) {
    if (isMastermindFeatureUnsupported(error)) {
      writeCachedMastermindCapability(false);
      return false;
    }

    throw error;
  }
}
