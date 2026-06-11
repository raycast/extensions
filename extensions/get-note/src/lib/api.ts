import {
  clearPendingAuthorizationSession,
  clearStoredCredentials,
  resolveCredentials,
  saveCredentials,
  savePendingAuthorizationSession,
} from "./session";
import { createRequestError, buildApiError, GetNoteAuthError, GetNoteError } from "./errors";
import {
  DeviceAuthorizationSession,
  GetNoteCredentials,
  GetNoteEnvelope,
  GetQuotaResponse,
  ImageUploadConfig,
  ImageUploadToken,
  KnowledgeBase,
  KnowledgeRecallResult,
  KnowledgeBaseNotesPage,
  NoteDetail,
  NotesPage,
  PendingDeviceAuthorizationSession,
  RecallResult,
  SaveLinkTask,
  StoredGetNoteSession,
  TaskProgress,
} from "./types";
import { GETNOTE_BASE_URL, GETNOTE_DEFAULT_CLIENT_ID, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "./constants";

const BIGINT_KEYS = ["id", "note_id", "next_cursor", "parent_id", "follow_id", "live_id"];
const DEFAULT_RATE_LIMIT_RETRY_MS = 10_000;
const RATE_LIMIT_RETRIES = 1;
const MAX_KNOWLEDGE_BASE_PAGES = 100;

function rewriteBigIntJson(raw: string): string {
  const pattern = new RegExp(`"(${BIGINT_KEYS.join("|")})"\\s*:\\s*(-?\\d+)`, "g");
  return raw.replace(pattern, '"$1":"$2"');
}

function parseRetryAfter(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value * 1000;
  }

  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(value);

  if (Number.isFinite(retryAt)) {
    return Math.max(retryAt - Date.now(), 0);
  }

  return undefined;
}

function retryAfterFromEnvelope(payload: unknown): number | undefined {
  const record = payload as {
    retry_after?: unknown;
    rate_limit?: { retry_after?: unknown };
    error?: { retry_after?: unknown; rate_limit?: { retry_after?: unknown } };
  };

  return (
    parseRetryAfter(record.retry_after) ??
    parseRetryAfter(record.rate_limit?.retry_after) ??
    parseRetryAfter(record.error?.retry_after) ??
    parseRetryAfter(record.error?.rate_limit?.retry_after)
  );
}

function retryAfterFromHeaders(response: Response): number | undefined {
  return parseRetryAfter(response.headers.get("retry-after"));
}

function tryParseEnvelope<T>(raw: string): GetNoteEnvelope<T> | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(rewriteBigIntJson(raw)) as GetNoteEnvelope<T>;
  } catch {
    return undefined;
  }
}

async function parseEnvelope<T>(response: Response): Promise<GetNoteEnvelope<T>> {
  const raw = await response.text();
  const payload = tryParseEnvelope<T>(raw);

  if (!response.ok) {
    throw createRequestError(
      new URL(response.url).pathname,
      response.status,
      retryAfterFromHeaders(response) ?? retryAfterFromEnvelope(payload),
    );
  }

  if (!payload) {
    throw new GetNoteError(`Request to ${GETNOTE_BASE_URL}${new URL(response.url).pathname} returned invalid JSON.`);
  }

  return payload;
}

async function requestWithCredentials<T>(
  credentials: GetNoteCredentials,
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    const response = await fetch(`${GETNOTE_BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: credentials.apiKey,
        "X-Client-ID": credentials.clientId,
        ...(init?.headers || {}),
      },
    });

    let payload: GetNoteEnvelope<T>;

    try {
      payload = await parseEnvelope<T>(response);
    } catch (error) {
      if (error instanceof GetNoteError && error.status === 429 && attempt < RATE_LIMIT_RETRIES) {
        await wait(error.retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_MS);
        continue;
      }

      throw error;
    }

    if (!payload.success) {
      if (payload.error?.code === 10001 && credentials.source === "local-storage") {
        await clearStoredCredentials();
      }

      if (payload.error?.code === 10202 && attempt < RATE_LIMIT_RETRIES) {
        await wait(retryAfterFromEnvelope(payload) ?? DEFAULT_RATE_LIMIT_RETRY_MS);
        continue;
      }

      throw buildApiError(payload.error, payload.request_id);
    }

    return payload.data;
  }

  throw new GetNoteError("GetNote API request failed after retrying.");
}

export async function getCredentialsOrThrow(): Promise<GetNoteCredentials> {
  const credentials = await resolveCredentials();

  if (!credentials) {
    throw new GetNoteAuthError();
  }

  return credentials;
}

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const credentials = await getCredentialsOrThrow();
  return requestWithCredentials<T>(credentials, endpoint, init);
}

export async function requestDeviceAuthorization(): Promise<PendingDeviceAuthorizationSession> {
  const response = await fetch(`${GETNOTE_BASE_URL}/open/api/v1/oauth/device/code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GETNOTE_DEFAULT_CLIENT_ID,
    }),
  });

  const payload = await parseEnvelope<{
    code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  }>(response);

  if (!payload.success) {
    throw buildApiError(payload.error, payload.request_id);
  }

  const session = {
    code: payload.data.code,
    userCode: payload.data.user_code,
    verificationUri: payload.data.verification_uri,
    expiresIn: payload.data.expires_in,
    interval: payload.data.interval,
    createdAt: Date.now(),
  };

  await savePendingAuthorizationSession(session);
  return session;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollDeviceAuthorization(
  session: DeviceAuthorizationSession,
  options?: {
    timeoutMs?: number;
    onPending?: () => void;
  },
): Promise<StoredGetNoteSession> {
  const deadline = Date.now() + (options?.timeoutMs ?? session.expiresIn * 1000);

  while (Date.now() < deadline) {
    const response = await fetch(`${GETNOTE_BASE_URL}/open/api/v1/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "device_code",
        client_id: GETNOTE_DEFAULT_CLIENT_ID,
        code: session.code,
      }),
    });

    const payload = await parseEnvelope<{
      api_key?: string;
      client_id?: string;
      key_id?: string;
      expires_at?: number;
      msg?: string;
    }>(response);

    if (payload.success && payload.data.api_key) {
      const stored = {
        apiKey: payload.data.api_key,
        clientId: payload.data.client_id || GETNOTE_DEFAULT_CLIENT_ID,
        expiresAt: payload.data.expires_at,
      };

      await saveCredentials(stored);
      await clearPendingAuthorizationSession();
      return stored;
    }

    const state = payload.data?.msg;

    if (state === "authorization_pending") {
      options?.onPending?.();
      await wait((session.interval || 5) * 1000);
      continue;
    }

    if (state === "rejected") {
      await clearPendingAuthorizationSession();
      throw new GetNoteError("You rejected the authorization request. Please start the flow again.");
    }

    if (state === "expired_token") {
      await clearPendingAuthorizationSession();
      throw new GetNoteError("The authorization code expired. Please start the flow again.");
    }

    if (state === "already_consumed") {
      await clearPendingAuthorizationSession();
      throw new GetNoteError("The authorization code has already been used. Please start the flow again.");
    }

    throw buildApiError(payload.error, payload.request_id);
  }

  throw new GetNoteError("Timed out while waiting for authorization. Please start the flow again.");
}

export async function listNotes(sinceId = "0"): Promise<NotesPage> {
  return request<NotesPage>(`/open/api/v1/resource/note/list?since_id=${encodeURIComponent(sinceId)}`);
}

export async function getNoteDetail(noteId: string): Promise<NoteDetail> {
  const data = await request<{ note: NoteDetail }>(
    `/open/api/v1/resource/note/detail?id=${encodeURIComponent(noteId)}`,
  );

  return data.note;
}

export async function searchNotes(query: string, topK = 5): Promise<RecallResult[]> {
  const data = await request<{ results: RecallResult[] }>("/open/api/v1/resource/recall", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      top_k: Math.min(Math.max(topK, 1), 10),
    }),
  });

  return data.results || [];
}

export async function searchKnowledgeBaseNotes(
  topicId: string,
  query: string,
  topK = 5,
): Promise<KnowledgeRecallResult[]> {
  const data = await request<{ results: KnowledgeRecallResult[] }>("/open/api/v1/resource/recall/knowledge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic_id: topicId,
      query,
      top_k: Math.min(Math.max(topK, 1), 10),
    }),
  });

  return data.results || [];
}

export async function saveTextNote(input: {
  title?: string;
  content: string;
  tags?: string[];
}): Promise<{ noteId: string }> {
  const data = await request<{ note_id: string }>("/open/api/v1/resource/note/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note_type: "plain_text",
      title: input.title || undefined,
      content: input.content,
      tags: input.tags?.length ? input.tags : undefined,
      parent_id: 0,
    }),
  });

  return {
    noteId: data.note_id,
  };
}

export async function saveLinkNote(input: { url: string; tags?: string[] }): Promise<SaveLinkTask> {
  const data = await request<{ tasks: SaveLinkTask[] }>("/open/api/v1/resource/note/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note_type: "link",
      link_url: input.url,
      tags: input.tags?.length ? input.tags : undefined,
    }),
  });

  const task = data.tasks?.[0];

  if (!task?.task_id) {
    throw new GetNoteError("The link note task was created, but no task_id was returned.");
  }

  return task;
}

export async function getImageUploadConfig(): Promise<ImageUploadConfig> {
  return request<ImageUploadConfig>("/open/api/v1/resource/image/config");
}

function isImageUploadToken(value: ImageUploadToken | { tokens?: ImageUploadToken[] }): value is ImageUploadToken {
  return "accessid" in value && "host" in value && "policy" in value && "signature" in value;
}

export async function getImageUploadToken(input: { extension: string }): Promise<ImageUploadToken> {
  const data = await request<ImageUploadToken | { tokens?: ImageUploadToken[] }>(
    `/open/api/v1/resource/image/upload_token?mime_type=${encodeURIComponent(input.extension)}`,
  );

  if (isImageUploadToken(data)) {
    return data;
  }

  const token = data.tokens?.[0];

  if (!token) {
    throw new GetNoteError("No image upload token was returned.");
  }

  return token;
}

export async function uploadImageToOSS(input: {
  token: ImageUploadToken;
  data: Buffer;
  filename: string;
}): Promise<{ imageId: string; accessUrl: string }> {
  const form = new FormData();
  const file = new Blob([input.data], { type: input.token.oss_content_type });

  form.append("key", input.token.object_key);
  form.append("OSSAccessKeyId", input.token.accessid);
  form.append("policy", input.token.policy);
  form.append("signature", input.token.signature);
  form.append("callback", input.token.callback);
  form.append("Content-Type", input.token.oss_content_type);
  form.append("file", file, input.filename);

  const response = await fetch(input.token.host, {
    method: "POST",
    body: form,
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new GetNoteError(`OSS upload failed (HTTP ${response.status}).`);
  }

  let imageId = "";

  try {
    const payload = raw ? (JSON.parse(raw) as { h?: { c?: number }; c?: { image?: { id?: string } } }) : undefined;

    if (typeof payload?.h?.c === "number" && payload.h.c !== 0) {
      throw new GetNoteError("OSS upload callback reported a failure.");
    }

    imageId = payload?.c?.image?.id || "";
  } catch (error) {
    if (error instanceof GetNoteError) {
      throw error;
    }
  }

  return {
    imageId,
    accessUrl: input.token.access_url,
  };
}

export async function saveImageNote(input: {
  title?: string;
  imageUrls: string[];
  tags?: string[];
}): Promise<{ noteIds: string[]; tasks: SaveLinkTask[] }> {
  const data = await request<{ note_id?: string; tasks?: SaveLinkTask[] }>("/open/api/v1/resource/note/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note_type: "img_text",
      title: input.title || undefined,
      image_urls: input.imageUrls,
      tags: input.tags?.length ? input.tags : undefined,
      parent_id: 0,
    }),
  });

  return {
    noteIds: data.note_id ? [data.note_id] : [],
    tasks: data.tasks || [],
  };
}

export async function getTaskProgress(taskId: string): Promise<TaskProgress> {
  return request<TaskProgress>("/open/api/v1/resource/note/task/progress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task_id: taskId,
    }),
  });
}

export async function waitForTask(
  taskId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onTick?: (progress: TaskProgress) => void;
  },
): Promise<string> {
  const deadline = Date.now() + (options?.timeoutMs ?? POLL_TIMEOUT_MS);

  while (Date.now() < deadline) {
    const progress = await getTaskProgress(taskId);
    options?.onTick?.(progress);

    if (progress.status === "success" && progress.note_id && progress.note_id !== "0") {
      return progress.note_id;
    }

    if (progress.status === "failed") {
      throw new GetNoteError(progress.error_msg || "The GetNote task failed.");
    }

    await wait(options?.intervalMs ?? POLL_INTERVAL_MS);
  }

  throw new GetNoteError("Timed out while waiting for the GetNote task to finish. Check Recent Notes later.");
}

export async function listKnowledgeBases(page = 1): Promise<{
  topics: KnowledgeBase[];
  has_more: boolean;
  total: number;
}> {
  return request<{
    topics: KnowledgeBase[];
    has_more: boolean;
    total: number;
  }>(`/open/api/v1/resource/knowledge/list?page=${page}`);
}

export async function listAllKnowledgeBases(): Promise<KnowledgeBase[]> {
  const topics: KnowledgeBase[] = [];
  let page = 1;

  while (page <= MAX_KNOWLEDGE_BASE_PAGES) {
    const data = await listKnowledgeBases(page);
    topics.push(...(data.topics || []));

    if (!data.has_more) {
      return topics;
    }

    page += 1;
  }

  throw new GetNoteError(`Stopped loading knowledge bases after ${MAX_KNOWLEDGE_BASE_PAGES} pages.`);
}

export async function createKnowledgeBase(input: {
  name: string;
  description?: string;
  cover?: string;
}): Promise<KnowledgeBase> {
  const data = await request<{
    topic?: KnowledgeBase;
    topic_id?: string;
    name?: string;
    description?: string;
    cover?: string;
    created_at?: string;
    updated_at?: string;
  }>("/open/api/v1/resource/knowledge/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description || "",
      cover: input.cover || "",
    }),
  });

  if (data.topic) {
    return data.topic;
  }

  return {
    topic_id: data.topic_id || "",
    name: data.name || input.name,
    description: data.description ?? input.description,
    cover: data.cover ?? input.cover,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function listKnowledgeBaseNotes(topicId: string, page = 1): Promise<KnowledgeBaseNotesPage> {
  return request<KnowledgeBaseNotesPage>(
    `/open/api/v1/resource/knowledge/notes?topic_id=${encodeURIComponent(topicId)}&page=${page}`,
  );
}

export async function addNoteToKnowledgeBase(topicId: string, noteIds: string[]): Promise<{ topicId: string }> {
  await request<Record<string, never>>("/open/api/v1/resource/knowledge/note/batch-add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic_id: topicId,
      note_ids: noteIds,
    }),
  });

  return { topicId };
}

export async function addTags(noteId: string, tags: string[]): Promise<{ noteId: string; tags: string[] }> {
  await request<Record<string, never>>("/open/api/v1/resource/note/tags/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note_id: noteId,
      tags,
    }),
  });

  return { noteId, tags };
}

export async function deleteTag(noteId: string, tagId: string): Promise<{ noteId: string; tagId: string }> {
  await request<Record<string, never>>("/open/api/v1/resource/note/tags/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note_id: noteId,
      tag_id: tagId,
    }),
  });

  return { noteId, tagId };
}

export async function deleteNote(noteId: string): Promise<{ noteId: string }> {
  await request<Record<string, never>>("/open/api/v1/resource/note/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note_id: noteId,
    }),
  });

  return { noteId };
}

export async function getQuota(): Promise<GetQuotaResponse> {
  return request<GetQuotaResponse>("/open/api/v1/resource/rate-limit/quota");
}
