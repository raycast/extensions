import { authorize, provider } from "./oauth";
import { TickTickApiError } from "./errors";

const BASE_URL = "https://api.ticktick.com";

/** Per-request options. `wipeTokenOn401` controls whether a 401 should invalidate the session. */
export interface RequestOptions {
  /**
   * When true (default for /open/v1 core paths), a 401 wipes the token and re-authenticates.
   * Set false for "speculative" calls — endpoints that may not exist in the OAuth API and are
   * tried opportunistically before an /api/v2 fallback. Their 401 must NOT wipe a valid session.
   */
  wipeTokenOn401?: boolean;
}

async function request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  let token = await authorize();

  const doFetch = (t: string) =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await doFetch(token);

  if (response.status === 401) {
    // A 401 means different things depending on the endpoint:
    // - Core /open/v1 task/project endpoints — a 401 means our token is genuinely rejected,
    //   so re-authenticate once via OAuthService and retry.
    // - /api/v2/* (internal web API) and speculative /open/v1 endpoints that may not exist in
    //   the OAuth API — a 401 here does NOT mean our token is bad. Wiping it would log the user
    //   out on every such call, so we throw and let the caller degrade gracefully / fall back.
    const shouldWipe = options?.wipeTokenOn401 ?? path.startsWith("/open/v1/");
    if (shouldWipe) {
      await provider.client.removeTokens();
      token = await authorize();
      response = await doFetch(token);
    } else {
      throw new TickTickApiError(
        401,
        `TickTick API error 401: endpoint ${path} is not available through the public OAuth API`,
      );
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new TickTickApiError(response.status, `TickTick API error ${response.status}: ${text}`);
  }

  const text = await response.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

export const apiGet = <T>(path: string, options?: RequestOptions): Promise<T> =>
  request<T>("GET", path, undefined, options);
export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
  request<T>("POST", path, body, options);
export const apiPut = <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
  request<T>("PUT", path, body, options);
export const apiDelete = <T>(path: string, options?: RequestOptions): Promise<T> =>
  request<T>("DELETE", path, undefined, options);
