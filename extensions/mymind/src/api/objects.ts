import { api, MyMindApiError } from "./client";
import { convert, ConvertFormat } from "./convert";
import { MyMindObject, MyMindObjectSchema, ObjectListSchema, RelatedResponseSchema, RelatedMatch } from "./schemas";

export interface ListObjectsOptions {
  id?: string | string[];
  q?: string;
  contentAs?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function listObjects(opts: ListObjectsOptions = {}): Promise<MyMindObject[]> {
  const data = await api.get<unknown>("/objects", {
    query: { id: opts.id, q: opts.q, contentAs: opts.contentAs, limit: opts.limit },
    signal: opts.signal,
  });
  return ObjectListSchema.parse(data);
}

const OBJECTS_BY_IDS_BATCH = 25;

export async function getObjectsByIds(ids: string[], signal?: AbortSignal): Promise<MyMindObject[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += OBJECTS_BY_IDS_BATCH) {
    chunks.push(ids.slice(i, i + OBJECTS_BY_IDS_BATCH));
  }
  const batches = await Promise.all(chunks.map((chunk) => listObjects({ id: chunk, limit: chunk.length, signal })));
  return batches.flat();
}

export async function getObject(id: string, signal?: AbortSignal): Promise<MyMindObject> {
  const data = await api.get<unknown>(`/objects/${encodeURIComponent(id)}`, { signal });
  return MyMindObjectSchema.parse(data);
}

export async function getRelated(id: string, limit = 50, signal?: AbortSignal): Promise<RelatedMatch[]> {
  const data = await api.get<unknown>(`/objects/${encodeURIComponent(id)}/related`, {
    query: { limit },
    signal,
  });
  const parsed = RelatedResponseSchema.parse(data);
  return Array.isArray(parsed) ? parsed : parsed.matches;
}

interface CreateBase {
  title?: string;
  tags?: string[];
  spaceIds?: string[];
}

export type CreateObjectInput =
  | ({ kind: "note"; markdown: string } & CreateBase)
  | ({ kind: "url"; url: string } & CreateBase);

interface CreateObjectResponse {
  id: string;
  title?: string;
  created?: string;
  modified?: string;
  bumped?: string;
}

function buildCreateBody(input: CreateObjectInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.title) body.title = input.title;
  if (input.tags?.length) body.tags = input.tags.map((name) => ({ name }));
  if (input.spaceIds?.length) body.spaces = input.spaceIds.map((id) => ({ id }));
  if (input.kind === "note") {
    body.content = input.markdown;
  } else if (input.kind === "url") {
    body.url = input.url;
  }
  return body;
}

export async function createObject(input: CreateObjectInput): Promise<CreateObjectResponse> {
  return api.post<CreateObjectResponse>("/objects", buildCreateBody(input));
}

interface BlobMetadata {
  title?: string;
  tags?: string[];
  spaceIds?: string[];
}

export async function createObjectFromBlob(
  file: { bytes: Uint8Array; filename: string; contentType?: string },
  meta: BlobMetadata = {},
): Promise<CreateObjectResponse> {
  const metadata: Record<string, unknown> = {};
  if (meta.title) metadata.title = meta.title;
  if (meta.tags?.length) metadata.tags = meta.tags.map((name) => ({ name }));
  if (meta.spaceIds?.length) metadata.spaces = meta.spaceIds.map((id) => ({ id }));

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }), "metadata.json");
  form.append("blob", new Blob([file.bytes], { type: file.contentType ?? "application/octet-stream" }), file.filename);

  return api.post<CreateObjectResponse>("/objects", form);
}

export async function deleteObject(id: string): Promise<void> {
  await api.delete(`/objects/${encodeURIComponent(id)}`);
}

export async function restoreObject(id: string): Promise<void> {
  await api.post(`/objects/${encodeURIComponent(id)}/restore`);
}

export async function addTagsToObject(id: string, tags: string[]): Promise<void> {
  if (!tags.length) return;
  await api.post(
    `/objects/${encodeURIComponent(id)}/tags`,
    tags.map((name) => ({ name })),
  );
}

export async function pinObject(id: string, position?: number): Promise<void> {
  await api.post(`/objects/${encodeURIComponent(id)}/pin`, position !== undefined ? { position } : undefined);
}

export async function unpinObject(id: string): Promise<void> {
  await api.delete(`/objects/${encodeURIComponent(id)}/pin`);
}

export async function updateObjectTitle(id: string, title: string): Promise<void> {
  await api.patch(`/objects/${encodeURIComponent(id)}`, { title });
}

export type ContentFormat = "markdown" | "prose" | "html";

const CONTENT_ACCEPT: Record<ContentFormat, string> = {
  markdown: "text/markdown",
  prose: "application/prose+json",
  html: "text/html",
};

export async function getObjectContent(id: string, format: ContentFormat = "markdown"): Promise<string> {
  const response = await api.getRaw(`/objects/${encodeURIComponent(id)}/content`, {
    accept: CONTENT_ACCEPT[format],
  });
  return response.text();
}

const CONTENT_GET_FALLBACK_STATUSES = new Set([404, 405, 406]);

interface ContentEnvelope {
  type: string;
  body: unknown;
}

function asEnvelope(value: unknown): ContentEnvelope | null {
  if (
    value &&
    typeof value === "object" &&
    "type" in value &&
    "body" in value &&
    typeof (value as { type: unknown }).type === "string"
  ) {
    return value as ContentEnvelope;
  }
  return null;
}

async function envelopeToMarkdown({ type, body }: ContentEnvelope): Promise<string> {
  if (body == null) return "";
  if (typeof body === "string") {
    if (type === "text/markdown") return body;
    return convert(body, type as ConvertFormat, "text/markdown");
  }
  return convert(JSON.stringify(body), "application/prose+json", "text/markdown");
}

export async function loadCardMarkdown(id: string): Promise<string> {
  try {
    return await getObjectContent(id, "markdown");
  } catch (err) {
    if (!(err instanceof MyMindApiError) || !CONTENT_GET_FALLBACK_STATUSES.has(err.status)) {
      throw err;
    }
  }
  const obj = await getObject(id);
  if (obj.content == null) return "";
  if (typeof obj.content === "string") return obj.content;
  const envelope = asEnvelope(obj.content);
  if (!envelope) return "";
  return envelopeToMarkdown(envelope);
}

export type WritableContentFormat = "markdown" | "prose";

export async function updateObjectContent(
  id: string,
  content: string,
  format: WritableContentFormat = "markdown",
): Promise<void> {
  await api.put(`/objects/${encodeURIComponent(id)}/content`, content, {
    contentType: format === "markdown" ? "text/markdown" : "application/prose+json",
  });
}
