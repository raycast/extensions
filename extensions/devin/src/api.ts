import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiToken: string;
  apiBaseUrl?: string;
  appBaseUrl?: string;
  userEmail?: string;
  useDevinReview?: boolean;
}

function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

function getApiBaseUrl(): string {
  const { apiBaseUrl } = getPrefs();
  const base = (apiBaseUrl || "https://api.devin.ai").replace(/\/+$/, "");
  return `${base}/v1`;
}

function getAppBaseUrl(): string {
  const { appBaseUrl } = getPrefs();
  return (appBaseUrl || "https://app.devin.ai").replace(/\/+$/, "");
}

function getHeaders() {
  const { apiToken } = getPrefs();
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

// ---------- Types ----------

export interface PullRequestInfo {
  url: string;
}

export interface SessionMessage {
  type: string;
  event_id: string;
  message: string;
  timestamp: string;
  origin?: string | null;
  user_id?: string | null;
  username?: string | null;
}

export interface SessionSummary {
  session_id: string;
  status: string;
  status_enum: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  requesting_user_email: string | null;
  tags: string[] | null;
  pull_request: PullRequestInfo | null;
  snapshot_id: string | null;
  playbook_id: string | null;
}

export interface SessionDetail {
  session_id: string;
  status: string;
  status_enum: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  tags: string[] | null;
  pull_request: PullRequestInfo | null;
  snapshot_id: string | null;
  playbook_id: string | null;
  structured_output: Record<string, unknown> | null;
  messages: SessionMessage[];
}

export interface ListSessionsResponse {
  sessions: SessionSummary[];
}

export interface CreateSessionResponse {
  session_id: string;
  url: string;
  is_new_session: boolean | null;
}

export interface SessionSecretInput {
  key: string;
  value: string;
  sensitive?: boolean;
}

export interface CreateSessionParams {
  prompt: string;
  title?: string;
  playbook_id?: string;
  snapshot_id?: string;
  tags?: string[];
  idempotent?: boolean;
  unlisted?: boolean;
  session_secrets?: SessionSecretInput[];
  max_acu_limit?: number;
}

export interface PlaybookResponse {
  playbook_id: string;
  title: string;
  body: string;
  status: string;
  access_type: string;
  org_id: string;
  macro: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_user_name: string | null;
  updated_by_user_name: string | null;
}

// ---------- Session endpoints ----------

export async function listSessions(limit = 50, offset = 0): Promise<SessionSummary[]> {
  const { userEmail } = getPrefs();
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (userEmail) {
    params.set("user_email", userEmail);
  }
  const url = `${getApiBaseUrl()}/sessions?${params.toString()}`;
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list sessions: ${response.status} ${text}`);
  }
  const data = (await response.json()) as ListSessionsResponse;
  return data.sessions;
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  const url = `${getApiBaseUrl()}/sessions/${sessionId}`;
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get session: ${response.status} ${text}`);
  }
  return (await response.json()) as SessionDetail;
}

export async function createSession(params: CreateSessionParams): Promise<CreateSessionResponse> {
  const body: Record<string, unknown> = { prompt: params.prompt };
  if (params.title) body.title = params.title;
  if (params.playbook_id) body.playbook_id = params.playbook_id;
  if (params.snapshot_id) body.snapshot_id = params.snapshot_id;
  if (params.tags && params.tags.length > 0) body.tags = params.tags;
  if (params.idempotent) body.idempotent = params.idempotent;
  if (params.unlisted) body.unlisted = params.unlisted;
  if (params.session_secrets && params.session_secrets.length > 0) body.session_secrets = params.session_secrets;
  if (params.max_acu_limit) body.max_acu_limit = params.max_acu_limit;

  const response = await fetch(`${getApiBaseUrl()}/sessions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create session: ${response.status} ${text}`);
  }
  return (await response.json()) as CreateSessionResponse;
}

export async function sendMessage(sessionId: string, message: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/sessions/${sessionId}/message`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send message: ${response.status} ${text}`);
  }
}

export async function terminateSession(sessionId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to terminate session: ${response.status} ${text}`);
  }
}

export async function updateSessionTags(sessionId: string, tags: string[]): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/sessions/${sessionId}/tags`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ tags }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update tags: ${response.status} ${text}`);
  }
}

// ---------- Playbook endpoints ----------

export async function listPlaybooks(): Promise<PlaybookResponse[]> {
  const url = `${getApiBaseUrl()}/playbooks`;
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list playbooks: ${response.status} ${text}`);
  }
  return (await response.json()) as PlaybookResponse[];
}

// ---------- URL helpers ----------

export function getSessionUrl(sessionId: string): string {
  const id = sessionId.replace(/^devin-/, "");
  return `${getAppBaseUrl()}/sessions/${id}`;
}

export function getSessionsPageUrl(): string {
  return `${getAppBaseUrl()}/sessions`;
}

/**
 * Convert a git provider PR URL to a Devin Review URL when the preference is enabled.
 * Falls back to the original URL if parsing fails or the preference is off.
 *
 * GitHub:  https://github.com/owner/repo/pull/123
 * GitLab:  https://gitlab.com/owner/repo/-/merge_requests/123
 * Review:  {appBaseUrl}/review/owner/repo/pull/123
 */
export function getPrUrl(originalUrl: string): string {
  const { useDevinReview } = getPrefs();
  if (useDevinReview === false) return originalUrl;

  try {
    const u = new URL(originalUrl);
    const parts = u.pathname.split("/").filter(Boolean);

    // GitHub: /owner/repo/pull/123
    const pullIdx = parts.indexOf("pull");
    if (pullIdx >= 2 && pullIdx + 1 < parts.length) {
      const owner = parts.slice(0, pullIdx - 1).join("/");
      const repo = parts[pullIdx - 1];
      const number = parts[pullIdx + 1];
      return `${getAppBaseUrl()}/review/${owner}/${repo}/pull/${number}`;
    }

    // GitLab: /owner/repo/-/merge_requests/123
    const mrIdx = parts.indexOf("merge_requests");
    if (mrIdx >= 3 && mrIdx + 1 < parts.length) {
      const dashIdx = parts.indexOf("-");
      if (dashIdx >= 2) {
        const owner = parts.slice(0, dashIdx - 1).join("/");
        const repo = parts[dashIdx - 1];
        const number = parts[mrIdx + 1];
        return `${getAppBaseUrl()}/review/${owner}/${repo}/pull/${number}`;
      }
    }
  } catch {
    // URL parsing failed, fall through
  }

  return originalUrl;
}

// ---------- Status helpers ----------

export type SessionStatus = "working" | "blocked" | "finished" | "expired" | "suspended" | "unknown";

export function normalizeStatus(status: string, statusEnum: string | null): SessionStatus {
  const s = statusEnum ?? status;
  if (s.includes("working") || s.includes("resumed") || s.includes("resume_requested")) return "working";
  if (s.includes("blocked")) return "blocked";
  if (s.includes("finished")) return "finished";
  if (s.includes("expired")) return "expired";
  if (s.includes("suspend")) return "suspended";
  return "unknown";
}
