import * as fs from "node:fs";

export type Workspace = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type PushCreateResponse = {
  account_id?: number | null;
  created_at: string;
  deletable_by_viewer: boolean;
  deleted: boolean;
  expire_after_days: number;
  expire_after_duration: number;
  expire_after_views: number;
  expired: boolean;
  expired_on: string | null;
  expires_at: string | null;
  expires_in: number;
  html_url: string;
  json_url: string;
  name?: string | null;
  note?: string | null;
  passphrase?: string | null;
  retrieval_step: boolean;
  updated_at: string;
  url_token: string;
  views_remaining: number;
};

export type PushCreateRequest = {
  payload?: string;
  expire_after_duration?: number;
  expire_after_views?: number;
  passphrase?: string;
  name?: string;
  note?: string;
  deletable_by_viewer?: boolean;
  retrieval_step?: boolean;
  kind?: string;
  notify_emails_to?: string;
  notify_emails_to_locale?: string;
  authenticated_recipients?: boolean;
  files?: string[];
};

export const PUBLIC_SERVER_URL = "https://eu.pwpush.com";
export const DEFAULT_EXPIRE_DURATION = 6; // 1 day
export const DEFAULT_EXPIRE_VIEWS = 10;
export const DURATION_LABELS: Record<number, string> = {
  0: "15 minutes",
  1: "30 minutes",
  2: "45 minutes",
  3: "1 hour",
  4: "6 hours",
  5: "12 hours",
  6: "1 day",
  7: "2 days",
  8: "3 days",
  9: "4 days",
  10: "5 days",
  11: "6 days",
  12: "1 week",
  13: "2 weeks",
  14: "3 weeks",
  15: "1 month",
  16: "2 months",
  17: "3 months",
};

export function isLocalhost(url: URL): boolean {
  const hostname = url.hostname;
  if (url.protocol !== "http:") {
    return false;
  }
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export function validateServerUrl(serverUrl: string | undefined): string | null {
  const raw = serverUrl?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && !isLocalhost(url)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function buildBaseUrl(serverUrl: string | undefined): string {
  const raw = serverUrl?.trim();
  if (!raw) return PUBLIC_SERVER_URL;

  const validated = validateServerUrl(serverUrl);
  if (!validated) {
    throw new Error(
      `Invalid server URL: ${raw}. Only HTTPS URLs are allowed, except for http://localhost, http://127.0.0.1, or http://[::1].`,
    );
  }

  return validated;
}

export function buildApiUrl(serverUrl: string | undefined, path: string): string {
  const base = buildBaseUrl(serverUrl);
  return `${base}/api/v2${path}`;
}

export function buildRequestHeaders(apiKey?: string, withContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};

  if (apiKey?.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  if (withContentType) {
    headers["Content-Type"] = "application/json";
  }

  headers["Accept"] = "application/json";
  return headers;
}

export async function buildPushRequestBody(
  push: PushCreateRequest,
  workspaceId?: number,
): Promise<{ body: string; isMultipart: false } | { body: FormData; isMultipart: true }> {
  if (push.files?.length) {
    const form = new FormData();
    form.append("push[payload]", push.payload ?? "");
    form.append("push[kind]", "file");

    appendOptionalFormField(form, "push[expire_after_duration]", push.expire_after_duration);
    appendOptionalFormField(form, "push[expire_after_views]", push.expire_after_views);
    appendOptionalFormField(form, "push[name]", push.name);
    appendOptionalFormField(form, "push[note]", push.note);
    appendOptionalFormField(form, "push[passphrase]", push.passphrase);
    appendOptionalFormField(form, "push[notify_emails_to]", push.notify_emails_to);
    appendOptionalFormField(form, "push[notify_emails_to_locale]", push.notify_emails_to_locale);
    appendOptionalBooleanFormField(form, "push[deletable_by_viewer]", push.deletable_by_viewer);
    appendOptionalBooleanFormField(form, "push[retrieval_step]", push.retrieval_step);
    appendOptionalBooleanFormField(form, "push[authenticated_recipients]", push.authenticated_recipients);

    if (workspaceId) {
      form.append("workspace_id", String(workspaceId));
    }

    for (const filePath of push.files) {
      const fileBuffer = await fs.promises.readFile(filePath);
      const fileName = filePath.split("/").pop() ?? "file";
      const blob = new Blob([fileBuffer]);
      form.append("push[files][]", blob, fileName);
    }

    return { body: form, isMultipart: true };
  }

  const body: { push: PushCreateRequest; workspace_id?: number } = { push };

  if (workspaceId) {
    body.workspace_id = workspaceId;
  }

  return { body: JSON.stringify(body), isMultipart: false };
}

function appendOptionalFormField(form: FormData, name: string, value: string | number | undefined): void {
  if (value === undefined || value === "") return;
  form.append(name, String(value));
}

function appendOptionalBooleanFormField(form: FormData, name: string, value: boolean | undefined): void {
  if (value === undefined) return;
  form.append(name, value ? "true" : "false");
}

export function extractPushUrl(serverUrl: string, response: PushCreateResponse): string | null {
  if (response.html_url) {
    try {
      const configuredOrigin = new URL(serverUrl).origin;
      const returnedUrl = new URL(response.html_url);

      if (returnedUrl.origin === configuredOrigin) {
        return response.html_url;
      }
    } catch {
      // Fall back to constructing from url_token.
    }
  }

  if (!response.url_token) {
    return null;
  }

  const normalized = serverUrl.replace(/\/$/, "");
  return `${normalized}/p/${response.url_token}`;
}

export function sanitizeApiError(status: number, statusText: string, bodyText?: string): string {
  const maxLength = 200;
  const sanitized =
    bodyText
      ?.replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength) ?? "";

  return `PwPush returned ${status} ${statusText}${sanitized ? `: ${sanitized}` : ""}`;
}

export async function fetchWorkspaces(serverUrl: string | undefined, apiKey?: string): Promise<Workspace[]> {
  const url = buildApiUrl(serverUrl, "/workspaces");
  const headers = buildRequestHeaders(apiKey, false);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const text = await response.text().catch(() => undefined);
    throw new Error(sanitizeApiError(response.status, response.statusText, text));
  }

  return (await response.json()) as Workspace[];
}

export async function createPush(
  serverUrl: string | undefined,
  apiKey: string | undefined,
  push: PushCreateRequest,
  workspaceId?: number,
): Promise<PushCreateResponse> {
  const url = buildApiUrl(serverUrl, "/pushes");
  const { body, isMultipart } = await buildPushRequestBody(push, workspaceId);
  const headers = buildRequestHeaders(apiKey, !isMultipart);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => undefined);
    throw new Error(sanitizeApiError(response.status, response.statusText, text));
  }

  return (await response.json()) as PushCreateResponse;
}

export async function expirePush(
  serverUrl: string | undefined,
  apiKey: string | undefined,
  urlToken: string,
): Promise<void> {
  const url = buildApiUrl(serverUrl, `/pushes/${urlToken}`);
  const headers = buildRequestHeaders(apiKey, false);

  const response = await fetch(url, { method: "DELETE", headers });

  if (!response.ok) {
    const text = await response.text().catch(() => undefined);
    throw new Error(sanitizeApiError(response.status, response.statusText, text));
  }
}
