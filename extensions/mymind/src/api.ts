import { getPreferenceValues } from "@raycast/api";
import { createHmac } from "crypto";
import { readFile } from "fs/promises";
import { basename } from "path";
import {
  ApiProblem,
  ApiProblemSchema,
  MyMindObject,
  MyMindObjectSchema,
  Preferences,
  PreferencesSchema,
  Space,
  SpaceSchema,
  Tag,
  TagSchema,
} from "./types";
import { buildObjectMetadata } from "./object-payload";
import { getUploadMimeType } from "./save-input";

const API_BASE_URL = "https://api.mymind.com";
const USER_AGENT = "raycast-mymind/2.0";
const TOP_OF_MIND_QUERY = "pinned:true";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  json?: unknown;
  accept?: string;
  redirect?: RequestRedirect;
};

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

export class TopOfMindUnavailableError extends Error {
  constructor(message = "Top of Mind listing isn't available with the current API response shape.") {
    super(message);
    this.name = "TopOfMindUnavailableError";
  }
}

function getPreferences(): Preferences {
  return PreferencesSchema.parse(getPreferenceValues<Preferences>());
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
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
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
    throw new MyMindApiError(
      problem?.detail ?? `Request failed with status ${response.status}`,
      response.status,
      problem?.type,
    );
  }

  return response;
}

function parseObject(data: unknown): MyMindObject {
  return MyMindObjectSchema.parse(data);
}

export async function listObjects(query?: { q?: string; spaceId?: string; limit?: number }): Promise<MyMindObject[]> {
  const response = await request("/objects", {
    query: {
      contentAs: "text/markdown",
      limit: query?.limit ?? 200,
      q: query?.q,
      spaceId: query?.spaceId,
    },
  });

  const data = await response.json();
  return Array.isArray(data) ? data.map(parseObject) : [];
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

export async function listTags(): Promise<Tag[]> {
  const response = await request("/tags");
  const data = await response.json();
  return Array.isArray(data) ? data.map((item) => TagSchema.parse(item)) : [];
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
    object: parseObject(await response.json()),
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
    object: parseObject(await response.json()),
    created: response.status === 201,
  };
}

export async function listTopOfMind(query?: { q?: string; limit?: number }): Promise<MyMindObject[]> {
  try {
    const response = await request("/objects", {
      query: {
        contentAs: "text/markdown",
        limit: query?.limit ?? 200,
        q: query?.q ? `${TOP_OF_MIND_QUERY} && ${query.q}` : TOP_OF_MIND_QUERY,
      },
    });

    const data = await response.json();
    return Array.isArray(data) ? data.map(parseObject) : [];
  } catch (error) {
    if (error instanceof MyMindApiError && (error.status === 400 || error.status === 422)) {
      throw new TopOfMindUnavailableError();
    }

    throw error;
  }
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
