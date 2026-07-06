import { getPreferenceValues } from "@raycast/api";

export type Visibility = "PRIVATE" | "PROTECTED" | "PUBLIC";

export interface Memo {
  name: string; // "memos/<uid>"
  uid?: string;
  content: string;
  visibility: Visibility;
  createTime: string;
}

interface Preferences {
  host: string;
  token: string;
}

function getConfig(): { host: string; token: string } {
  const { host, token } = getPreferenceValues<Preferences>();
  return { host: host.replace(/\/+$/, ""), token };
}

export function getHost(): string {
  return getConfig().host;
}

export function memoUid(memo: Memo): string {
  return memo.uid ?? memo.name.split("/")[1];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { host, token } = getConfig();
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Memos API error ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return (await response.json()) as T;
}

export async function createMemo(content: string, visibility: Visibility = "PRIVATE"): Promise<Memo> {
  return request<Memo>("/api/v1/memos", {
    method: "POST",
    body: JSON.stringify({ content, visibility }),
  });
}

export async function listMemos(pageSize = 30): Promise<Memo[]> {
  const data = await request<{ memos?: Memo[] }>(`/api/v1/memos?pageSize=${pageSize}`);
  return data.memos ?? [];
}
