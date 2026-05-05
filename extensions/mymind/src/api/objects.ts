import { api } from "./client";
import { MyMindObject, MyMindObjectSchema, ObjectListSchema } from "./schemas";

export interface ListObjectsOptions {
  id?: string | string[];
  q?: string;
  spaceId?: string;
  similarTo?: string;
  contentAs?: string;
  limit?: number;
  semantic?: boolean;
  semanticBoost?: number;
  rerank?: boolean;
  signal?: AbortSignal;
}

export async function listObjects(opts: ListObjectsOptions = {}): Promise<MyMindObject[]> {
  const data = await api.get<unknown>("/objects", {
    query: {
      id: opts.id,
      q: opts.q,
      spaceId: opts.spaceId,
      similarTo: opts.similarTo,
      contentAs: opts.contentAs,
      limit: opts.limit,
      semantic: opts.semantic,
      semanticBoost: opts.semanticBoost,
      rerank: opts.rerank,
    },
    signal: opts.signal,
  });
  return ObjectListSchema.parse(data);
}

export interface GetObjectOptions {
  contentAs?: string;
  signal?: AbortSignal;
}

export async function getObject(id: string, opts: GetObjectOptions = {}): Promise<MyMindObject> {
  const data = await api.get<unknown>(`/objects/${encodeURIComponent(id)}`, {
    query: { contentAs: opts.contentAs },
    signal: opts.signal,
  });
  return MyMindObjectSchema.parse(data);
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

export async function removeTagsFromObject(id: string, tags: string[]): Promise<void> {
  if (!tags.length) return;
  await api.delete(
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

export interface UpdateObjectFields {
  title?: string;
  summary?: string | null;
}

export async function updateObject(id: string, fields: UpdateObjectFields): Promise<void> {
  if (Object.keys(fields).length === 0) return;
  await api.patch(`/objects/${encodeURIComponent(id)}`, fields);
}

export async function addNoteToObject(objectId: string, markdown: string): Promise<void> {
  await api.post(`/objects/${encodeURIComponent(objectId)}/notes`, markdown, {
    contentType: "text/markdown",
  });
}

export async function updateNote(objectId: string, noteId: string, markdown: string): Promise<void> {
  await api.put(
    `/objects/${encodeURIComponent(objectId)}/notes/${encodeURIComponent(noteId)}`,
    markdown,
    { contentType: "text/markdown" },
  );
}

export async function deleteNote(objectId: string, noteId: string): Promise<void> {
  await api.delete(`/objects/${encodeURIComponent(objectId)}/notes/${encodeURIComponent(noteId)}`);
}

export async function loadCardMarkdown(id: string, signal?: AbortSignal): Promise<string> {
  const obj = await getObject(id, { contentAs: "text/markdown", signal });
  return extractMarkdown(obj.content);
}

function extractMarkdown(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (typeof content !== "object") return "";
  const body = (content as { body?: unknown }).body;
  if (typeof body === "string") return body;
  return "";
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
