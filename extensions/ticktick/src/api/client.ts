import { authorize } from "./oauth";

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
    // Token rejected — force re-auth once via OAuthService
    const { provider } = await import("./oauth");
    await provider.client.removeTokens();
    token = await authorize();
    response = await doFetch(token);
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
