import { clearTokens, getAccessToken, getServerUrl } from "./oauth";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request(
  path: string,
  init: RequestInit,
  token: string,
): Promise<Response> {
  return fetch(`${getServerUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

/**
 * Authenticated JSON fetch against the TaskTickr server.
 * On 401 the stored tokens are dropped and the request is retried once
 * after a fresh authorization.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await request(path, init, await getAccessToken());
  if (res.status === 401) {
    await clearTokens();
    res = await request(path, init, await getAccessToken());
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Resolve the presigned download URL for an attachment.
 * The server replies with a 302 redirect to a presigned URL (valid ~1h);
 * we capture the Location header instead of following it so the URL can be
 * opened in the browser.
 */
export async function getAttachmentDownloadUrl(
  attachmentId: string,
): Promise<string> {
  const path = `/api/attachments/${attachmentId}/download`;
  let res = await request(path, { redirect: "manual" }, await getAccessToken());
  if (res.status === 401) {
    await clearTokens();
    res = await request(path, { redirect: "manual" }, await getAccessToken());
  }
  const location = res.headers.get("location");
  if ((res.status !== 302 && res.status !== 301) || !location) {
    throw new ApiError(
      res.status,
      `Could not resolve download URL (${res.status})`,
    );
  }
  return location;
}
