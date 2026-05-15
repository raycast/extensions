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

function rewriteBigIntJson(raw: string): string {
  const pattern = new RegExp(`"(${BIGINT_KEYS.join("|")})"\\s*:\\s*(-?\\d+)`, "g");
  return raw.replace(pattern, '"$1":"$2"');
}

async function parseEnvelope<T>(response: Response): Promise<GetNoteEnvelope<T>> {
  const raw = await response.text();

  if (!response.ok) {
    throw createRequestError(new URL(response.url).pathname, response.status);
  }

  return JSON.parse(rewriteBigIntJson(raw)) as GetNoteEnvelope<T>;
}

async function requestWithCredentials<T>(
  credentials: GetNoteCredentials,
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${GETNOTE_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: credentials.apiKey,
      "X-Client-ID": credentials.clientId,
      ...(init?.headers || {}),
    },
  });

  const payload = await parseEnvelope<T>(response);

  if (!payload.success) {
    if (payload.error?.code === 10001 && credentials.source === "local-storage") {
      await clearStoredCredentials();
    }

    throw buildApiError(payload.error, payload.request_id);
  }

  return payload.data;
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

export async function saveLinkNote(url: string): Promise<SaveLinkTask> {
  const data = await request<{ tasks: SaveLinkTask[] }>("/open/api/v1/resource/note/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      note_type: "link",
      link_url: url,
    }),
  });

  const task = data.tasks?.[0];

  if (!task?.task_id) {
    throw new GetNoteError("The link note task was created, but no task_id was returned.");
  }

  return task;
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
    onTick?: (status: TaskProgress["status"]) => void;
  },
): Promise<string> {
  const deadline = Date.now() + (options?.timeoutMs ?? POLL_TIMEOUT_MS);

  while (Date.now() < deadline) {
    const progress = await getTaskProgress(taskId);
    options?.onTick?.(progress.status);

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
