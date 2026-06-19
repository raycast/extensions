import { getExtensionPreferences } from "./preferences";
import {
  CreateSessionInput,
  CreateSessionResult,
  DevinClient,
  SessionDetail,
  SessionListResult,
  SessionMessage,
  SessionStatus,
  SessionSummary,
} from "../types";

type SessionSummaryResponse = {
  created_at: string;
  session_id: string;
  status?: string;
  updated_at: string;
  playbook_id?: string | null;
  pull_request?: { url?: string | null } | null;
  requesting_user_email?: string | null;
  snapshot_id?: string | null;
  status_enum?: string | null;
  structured_output?: unknown;
  tags?: string[] | null;
  title?: string | null;
  url?: string | null;
  session_url?: string | null;
};

type SessionDetailResponse = SessionSummaryResponse & {
  messages?: unknown[];
};

type CreateSessionResponse = {
  session_id: string;
  url?: string | null;
  is_new_session?: boolean | null;
};

type MessageSentResponse = {
  detail?: string | null;
};

class DevinApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "DevinApiError";
    this.statusCode = statusCode;
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function buildQuery(params: Record<string, string | number | undefined | string[]>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function normalizeStatus(raw: SessionSummaryResponse): SessionStatus {
  return (raw.status_enum || raw.status || "unknown") as SessionStatus;
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function buildSessionUrl(sessionId: string, appBaseUrl: string, explicitUrl?: string | null): string {
  if (explicitUrl) {
    if (/^https?:\/\//i.test(explicitUrl)) {
      return explicitUrl;
    }

    const normalizedPath = explicitUrl.startsWith("/") ? explicitUrl : `/${explicitUrl}`;
    return `${normalizeBaseUrl(appBaseUrl)}${normalizedPath}`;
  }

  const normalizedSessionId = sessionId.startsWith("devin-") ? sessionId.slice("devin-".length) : sessionId;

  return `${normalizeBaseUrl(appBaseUrl)}/sessions/${encodeURIComponent(normalizedSessionId)}`;
}

function normalizeSummary(raw: SessionSummaryResponse, appBaseUrl: string): SessionSummary {
  const status = normalizeStatus(raw);

  return {
    id: raw.session_id,
    title: raw.title?.trim() || raw.session_id,
    status,
    statusLabel: formatStatusLabel(status),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    playbookId: raw.playbook_id || undefined,
    snapshotId: raw.snapshot_id || undefined,
    requestingUserEmail: raw.requesting_user_email || undefined,
    pullRequestUrl: raw.pull_request?.url || undefined,
    structuredOutput: raw.structured_output,
    tags: raw.tags ?? [],
    url: buildSessionUrl(raw.session_id, appBaseUrl, raw.url || raw.session_url),
  };
}

function normalizeMessage(message: unknown): SessionMessage | null {
  if (!message || typeof message !== "object") {
    return null;
  }

  const value = message as Record<string, unknown>;
  const body =
    typeof value.message === "string"
      ? value.message
      : typeof value.text === "string"
        ? value.text
        : typeof value.body === "string"
          ? value.body
          : typeof value.content === "string"
            ? value.content
            : Array.isArray(value.content)
              ? value.content
                  .map((entry) => {
                    if (typeof entry === "string") {
                      return entry;
                    }

                    if (
                      entry &&
                      typeof entry === "object" &&
                      typeof (entry as Record<string, unknown>).text === "string"
                    ) {
                      return (entry as Record<string, string>).text;
                    }

                    return "";
                  })
                  .filter(Boolean)
                  .join("\n")
              : "";

  if (!body.trim()) {
    return null;
  }

  const author =
    typeof value.role === "string"
      ? value.role
      : typeof value.author === "string"
        ? value.author
        : typeof value.sender === "string"
          ? value.sender
          : typeof value.username === "string" && value.username.trim()
            ? value.username
            : value.type === "devin_message"
              ? "Devin"
              : typeof value.type === "string" && value.type.includes("user_message")
                ? "You"
                : undefined;

  const createdAt =
    typeof value.created_at === "string"
      ? value.created_at
      : typeof value.timestamp === "string"
        ? value.timestamp
        : undefined;

  return {
    author,
    body: body.trim(),
    createdAt,
  };
}

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}`;

  try {
    const text = await response.text();
    if (text) {
      try {
        const payload = JSON.parse(text) as {
          detail?: string;
          message?: string;
        };
        message = payload.detail || payload.message || message;
      } catch {
        message = text;
      }
    }
  } catch {
    // Ignore body read errors and throw the status-based message below.
  }

  throw new DevinApiError(message, response.status);
}

class HttpDevinClient implements DevinClient {
  constructor(
    private apiBaseUrl: string,
    private appBaseUrl: string,
    private apiKey: string,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      await parseError(response);
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  }

  async listSessions(input: {
    limit?: number;
    offset?: number;
    tags?: string[];
    userEmail?: string;
  }): Promise<SessionListResult> {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const query = buildQuery({
      limit,
      offset,
      tags: input.tags,
      user_email: input.userEmail,
    });

    const response = await this.request<{ sessions: SessionSummaryResponse[] }>(`/sessions${query}`, { method: "GET" });
    const sessions = response.sessions.map((session) => normalizeSummary(session, this.appBaseUrl));

    return {
      sessions,
      hasMore: sessions.length >= limit,
      nextOffset: offset + sessions.length,
    };
  }

  async getSession(sessionId: string): Promise<SessionDetail> {
    const response = await this.request<SessionDetailResponse>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: "GET",
    });

    return {
      ...normalizeSummary(response, this.appBaseUrl),
      messages: (response.messages ?? [])
        .map(normalizeMessage)
        .filter((message): message is SessionMessage => Boolean(message)),
    };
  }

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const response = await this.request<CreateSessionResponse>("/sessions", {
      method: "POST",
      body: JSON.stringify({
        prompt: input.prompt,
        title: input.title || undefined,
        tags: input.tags?.length ? input.tags : undefined,
        snapshot_id: input.snapshotId || undefined,
        playbook_id: input.playbookId || undefined,
        max_acu_limit: input.maxAcuLimit,
        unlisted: input.unlisted,
        idempotent: input.idempotent,
      }),
    });

    return {
      id: response.session_id,
      url: buildSessionUrl(response.session_id, this.appBaseUrl, response.url),
      isNewSession: response.is_new_session ?? true,
    };
  }

  async sendMessage(sessionId: string, message: string): Promise<string> {
    const response = await this.request<MessageSentResponse>(`/sessions/${encodeURIComponent(sessionId)}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });

    return response.detail || "Message sent.";
  }
}

let client: DevinClient | undefined;
let cachedApiKey: string | undefined;
let cachedApiBaseUrl: string | undefined;
let cachedAppBaseUrl: string | undefined;

export function getDevinClient(): DevinClient {
  const preferences = getExtensionPreferences();
  const apiKey = preferences.apiKey;
  const apiBaseUrl = normalizeBaseUrl(preferences.apiBaseUrl);
  const appBaseUrl = normalizeBaseUrl(preferences.appBaseUrl);

  // Recreate the client if preferences changed so updates in the extension
  // preferences are reflected without restarting the extension process.
  if (!client || apiKey !== cachedApiKey || apiBaseUrl !== cachedApiBaseUrl || appBaseUrl !== cachedAppBaseUrl) {
    client = new HttpDevinClient(apiBaseUrl, appBaseUrl, apiKey);
    cachedApiKey = apiKey;
    cachedApiBaseUrl = apiBaseUrl;
    cachedAppBaseUrl = appBaseUrl;
  }

  return client;
}

export { DevinApiError };
