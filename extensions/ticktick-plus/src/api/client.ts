import { authorize, provider } from "./oauth";

const BASE_URL = "https://api.ticktick.com";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
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
    // A 401 means different things on TickTick's two APIs:
    // - /open/v1/* is the official OAuth API — a 401 here means our token is genuinely
    //   rejected, so re-authenticate once via OAuthService and retry.
    // - /api/v2/* is TickTick's internal web API — it does NOT accept OAuth bearer tokens
    //   (returns 401 "user_not_sign_on") and requires a browser session cookie we can't get.
    //   Wiping the valid OAuth token here would log the user out on every V2 call, so instead
    //   we throw and let the caller degrade gracefully (empty state / omitted data).
    if (path.startsWith("/open/v1/")) {
      await provider.client.removeTokens();
      token = await authorize();
      response = await doFetch(token);
    } else {
      throw new Error(`TickTick API error 401: endpoint ${path} is not available through the public OAuth API`);
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`TickTick API error ${response.status}: ${text}`);
  }

  const text = await response.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: unknown): Promise<T> => request<T>("POST", path, body);
export const apiPut = <T>(path: string, body?: unknown): Promise<T> => request<T>("PUT", path, body);
export const apiDelete = <T>(path: string): Promise<T> => request<T>("DELETE", path);
