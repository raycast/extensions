import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_CONVEX_URL } from "../config";
import type { AskAiResponse, Folder, Note } from "../types";

type ListNotesParams = {
  includeDeleted?: boolean;
  tags?: string[];
  source?: "web" | "raycast";
  limit?: number;
  folderId?: string;
  quickCapturedOnly?: boolean;
  lockedOnly?: boolean;
  e2eOnly?: boolean;
  sharedOnly?: boolean;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export class RemoApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getApiKey() {
  const preferences = getPreferenceValues();
  const key = preferences.apiKey?.trim();

  if (!key) {
    throw new RemoApiError("Missing API key. Add it in Raycast extension preferences.", 401, "API_KEY_MISSING");
  }

  return key;
}

function getBaseUrl() {
  const baseUrl = new URL(DEFAULT_CONVEX_URL);

  if (baseUrl.hostname.endsWith(".convex.cloud")) {
    baseUrl.hostname = baseUrl.hostname.replace(".convex.cloud", ".convex.site");
  }

  return `${baseUrl.origin}/api`;
}

async function parseError(response: Response) {
  let payload: ApiErrorPayload | null = null;
  const rawBody = await response.text();

  try {
    payload = rawBody ? (JSON.parse(rawBody) as ApiErrorPayload) : null;
  } catch {
    payload = null;
  }

  const fallbackBody = rawBody.trim();
  const message =
    payload?.error?.message ||
    payload?.message ||
    (fallbackBody ? fallbackBody.slice(0, 240) : undefined) ||
    `Request failed with status ${response.status}.`;
  const code = payload?.error?.code;

  throw new RemoApiError(message, response.status, code);
}

async function request<T>(path: string, init?: RequestInit) {
  const apiKey = getApiKey();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as T;
}

function toQueryString(params: Record<string, string | number | boolean | string[] | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, item);
      }
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const remoApi = {
  recentNotes(limit = 20) {
    return request<Note[]>(`/notes/recent${toQueryString({ limit })}`);
  },

  searchNotes(query: string) {
    return request<Note[]>(`/notes/search${toQueryString({ query })}`);
  },

  listNotes(params: ListNotesParams) {
    const query = toQueryString({
      includeDeleted: params.includeDeleted,
      source: params.source,
      limit: params.limit,
      folderId: params.folderId,
      quickCapturedOnly: params.quickCapturedOnly,
      lockedOnly: params.lockedOnly,
      e2eOnly: params.e2eOnly,
      sharedOnly: params.sharedOnly,
      tag: params.tags,
    });

    return request<Note[]>(`/notes/list${query}`);
  },

  listFolders() {
    return request<Folder[]>("/folders/list");
  },

  async createNote(payload: {
    title?: string;
    content?: string;
    source: "web" | "raycast";
    tags?: string[];
    folderId?: string;
    isQuickCaptured?: boolean;
    autoFormat?: boolean;
  }): Promise<Note["_id"]> {
    const data = await request<{ noteId: string }>("/notes/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return data.noteId as Note["_id"];
  },

  async quickCaptureNote(payload: { content: string; autoFormat?: boolean }): Promise<Note["_id"]> {
    const data = await request<{ noteId: string }>("/notes/quick-capture", {
      method: "POST",
      body: JSON.stringify({
        content: payload.content,
        source: "raycast",
        autoFormat: payload.autoFormat,
      }),
    });

    return data.noteId as Note["_id"];
  },

  togglePin(noteId: string) {
    return request<{ noteId: string; isPinned: boolean }>("/notes/toggle-pin", {
      method: "POST",
      body: JSON.stringify({ noteId }),
    });
  },

  restoreNote(noteId: string) {
    return request<{ success: boolean }>("/notes/restore", {
      method: "POST",
      body: JSON.stringify({ noteId }),
    });
  },

  permanentDelete(noteId: string, password?: string) {
    return request<{ success: boolean }>("/notes/permanent-delete", {
      method: "POST",
      body: JSON.stringify({ noteId, password }),
    });
  },

  async askAi(query: string) {
    const data = await request<{
      answer: string;
      citations?: AskAiResponse["citations"];
      matches?: AskAiResponse["matches"];
    }>("/ai/ask", {
      method: "POST",
      body: JSON.stringify({ query }),
    });

    return {
      answer: data.answer,
      citations: data.citations ?? [],
      matches: data.matches ?? [],
    } satisfies AskAiResponse;
  },
};
