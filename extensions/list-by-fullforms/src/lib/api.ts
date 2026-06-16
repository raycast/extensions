// Tiny shared client for the FullForms List /api/v1/* surface.
//
// Two preferences feed it: the user-pasted Bearer token, and an
// optional base URL override for local testing. The default base is
// the production list.fullforms.com host; overriding to
// http://localhost:3000 lets the extension iterate against a local
// dev server without rebuilding.
//
// Error mapping mirrors the server's: 401 → token gone bad (revoked
// from /account, or the JWT secret rotated), 429 → per-token
// rate-limit budget exhausted, anything else surfaces with the raw
// status + body so the user gets enough signal to debug. The strings
// here are user-visible (Raycast toasts render them verbatim) so they
// stay free of jargon.

import { getPreferenceValues } from "@raycast/api";

// Preferences are typed via the ambient `ExtensionPreferences`
// declaration that ray build auto-generates into raycast-env.d.ts
// from package.json's preferences block. Reusing the generated type
// (rather than redeclaring it here) keeps the manifest as the single
// source of truth — adding / renaming a preference in package.json
// auto-propagates to every getPreferenceValues<ExtensionPreferences>()
// call site without a manual sync step that could silently drift.

// Wire shapes for /api/v1/workspaces + /api/v1/lists, shared across
// every command that picks a list to write to or filter by. Kept
// here (rather than per-command) because the shape IS the API
// surface — when the server adds a field, this file is the single
// place to update. Per-command files can narrow these via local
// types if they only need a subset.

export interface Workspace {
  id: number;
  name: string;
  // 'personal' for the user's own workspace, 'team' for any
  // workspace they belong to via invitation.
  type: string;
  // Caller's role within the workspace — 'owner', 'admin',
  // 'editor', or 'viewer'.
  role: string;
}

export interface Tag {
  id: number;
  name: string;
}

// One row from /api/v1/lists. `tags` was added by list-repo
// migration 20260607000000 (alphabetically sorted, possibly empty);
// some call-sites still guard with Array.isArray to survive the
// cross-deploy cache window per CLAUDE.md → Common Pitfalls.
// `effective_role` is the caller's resolved role on this specific
// list (workspace role + any per-list override); `is_public`
// describes the list itself, not the workspace it lives in.
export interface ListRow {
  id: number;
  workspace_id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  icon: string | null;
  color: string | null;
  effective_role: string;
  entry_count: number;
  tags: Tag[];
}

export interface WorkspacesResponse {
  workspaces: Workspace[];
}

export interface ListsResponse {
  lists: ListRow[];
}

const DEFAULT_BASE = "https://list.fullforms.com";

export function apiBase(): string {
  const { apiBase: configured } = getPreferenceValues<ExtensionPreferences>();
  return (configured || DEFAULT_BASE).replace(/\/$/, "");
}

// Just the host portion of the configured apiBase, for display in
// places where the full URL would be too long (e.g. Raycast metadata
// link text). Reflects whatever the user has configured —
// `list.fullforms.com` for the default, `localhost:3000` for a local
// dev override — so the displayed string matches the URL the link
// actually opens. Falls back to the raw apiBase string on URL parse
// failure (shouldn't happen since apiBase is constrained, but cheap
// safety net).
export function apiHost(): string {
  try {
    return new URL(apiBase()).host;
  } catch {
    return apiBase();
  }
}

export function authHeaders(): Record<string, string> {
  const { apiToken } = getPreferenceValues<ExtensionPreferences>();
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new Error(
      "Token invalid or revoked. Open extension preferences and paste a fresh one from list.fullforms.com/account.",
    );
  }
  if (res.status === 429) {
    throw new Error(
      "Rate limited (60 requests per minute per token). Wait a minute and try again.",
    );
  }
  if (res.status === 503) {
    throw new Error(
      "Server reports the auth secret isn't configured. Reach out to the List team.",
    );
  }
  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

// Nitro error responses arrive as JSON like
//   { "statusCode": 403, "statusMessage": "suggestions_not_enabled", ... }
// so the raw body is ugly. Pull statusMessage out when it's there;
// fall back to the raw text (for non-JSON bodies) or statusText.
async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return res.statusText;
  try {
    const parsed = JSON.parse(text);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.statusMessage === "string" &&
      parsed.statusMessage.length > 0
    ) {
      return parsed.statusMessage;
    }
  } catch {
    // not JSON; fall through to the raw text
  }
  return text;
}

// Thrown for any non-canned non-ok response. Carries the HTTP status
// so command-side handlers can branch on `error.status` (e.g. show a
// different toast for 403 vs 409) without parsing the message string.
// The structured status codes raised inside the server-side RPCs come
// through as `error.message` verbatim — e.g. "suggestions_not_enabled",
// "list_not_accessible", "limit_reached:entries (current=N, max=M)" —
// so commands can switch on the message for friendlier copy.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
