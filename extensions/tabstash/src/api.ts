import { getAccessToken } from "@raycast/utils";

const API_BASE = "https://tabsta.sh";

export async function fetchTabStash<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { token } = getAccessToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired — please re-authenticate");
    }
    const body = await res.json().catch(() => null);
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      res.statusText;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export function captureLink(url: string, title?: string) {
  return fetchTabStash<import("./types").LinkItem>("/v1/capture", {
    method: "POST",
    body: JSON.stringify({
      url,
      title,
      idempotencyKey: crypto.randomUUID(),
      clientId: "raycast-v1",
    }),
  });
}
