import { getPreferenceValues } from "@raycast/api";
import type {
  ImportRequest,
  Session,
  SessionDockEnvelope,
  SessionDockError,
} from "./types";

type Preferences = {
  apiBaseUrl: string;
  apiToken: string;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

function getConfig() {
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = prefs.apiBaseUrl.trim().replace(/\/+$/, "");
  const token = prefs.apiToken.trim();

  if (!baseUrl) {
    throw new Error("SessionDock API Base URL is missing.");
  }

  if (!token) {
    throw new Error("SessionDock API token is missing.");
  }

  return { baseUrl, token };
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const json = text
    ? (JSON.parse(text) as SessionDockEnvelope<T> | SessionDockError)
    : undefined;

  if (!response.ok) {
    const error = json as SessionDockError | undefined;
    const code = error?.error?.code;
    const message = error?.error?.message;

    if (code === "read_only") {
      throw new Error(
        "SessionDock is in read-only mode. Enable Full Automation in SessionDock Settings > Local API.",
      );
    }

    if (code === "unauthorized" || response.status === 401) {
      throw new Error(
        "SessionDock API token is invalid or missing. Update API Token in Raycast extension preferences.",
      );
    }

    const fallback =
      message ?? `SessionDock API request failed (${response.status}).`;
    throw new Error(fallback);
  }

  if (!json || !("data" in json)) {
    throw new Error("SessionDock API returned an unexpected response.");
  }

  return json.data;
}

export async function listSessions(params: {
  query?: string;
  limit?: number;
  sort?: string;
}) {
  const search = new URLSearchParams();

  if (params.query) {
    search.set("q", params.query);
  }

  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }

  if (params.sort) {
    search.set("sort", params.sort);
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<Session[]>(`/sessions${suffix}`);
}

export async function createSession(input: {
  title: string;
  kind?: string;
  status?: string;
  projectPath?: string;
  previewAudioPath?: string;
  previewAudioMime?: string;
  tags?: string[];
  notes?: string;
}) {
  return request<Session>("/sessions", {
    method: "POST",
    body: {
      title: input.title,
      kind: input.kind,
      status: input.status,
      projectPath: input.projectPath,
      previewAudioPath: input.previewAudioPath,
      previewAudioMime: input.previewAudioMime,
      tags: input.tags,
      notes: input.notes,
    },
  });
}

export async function focusSession(id: string) {
  return request<{ id: string; focused: boolean }>(`/sessions/${id}/focus`, {
    method: "POST",
  });
}

export async function openSessionProject(id: string) {
  return request<{ id: string; opened: boolean }>(`/sessions/${id}/open`, {
    method: "POST",
  });
}

export async function getSessionNotes(id: string) {
  const result = await request<{ id: string; notes: string | null }>(
    `/sessions/${id}/notes`,
  );
  return result.notes;
}

export async function getSessionPreview(id: string) {
  return request<{
    id: string;
    previewStatus?: string;
    previewUrl?: string | null;
    preferredPreviewId?: string | null;
  }>(`/sessions/${id}/preview`);
}

export async function triggerImport(body: ImportRequest) {
  return request<{
    importId?: string;
    done?: boolean;
    total?: number;
    pipelineState?: string;
    remainingPreviewFiles?: number;
    preflight?: {
      sessionCount?: number;
      previewFileCount?: number;
      previewBytes?: number;
      estimatedPreviewWaves?: number;
    };
  }>("/import", {
    method: "POST",
    body,
  });
}
