import { getPreferences } from "./preferences";

export interface ForgejoUser {
  id: number;
  login: string;
  avatar_url: string;
}

export interface ForgejoRepo {
  id: number;
  name: string;
  html_url: string;
  private: boolean;
  language: string | null;
  avatar_url: string;
  updated_at: string;
  owner: {
    login: string;
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { instanceUrl, apiToken } = getPreferences();
  const base = instanceUrl.replace(/\/$/, "");
  const url = `${base}/api/v1${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `token ${apiToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot reach Forgejo — check your instance URL and network connection.",
    );
  }

  if (!response.ok) {
    const text = await response.text();
    let message: string;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      message = text;
    }
    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getUser(username: string): Promise<ForgejoUser> {
  return apiFetch<ForgejoUser>(`/users/${encodeURIComponent(username)}`);
}

export async function searchRepos(userId: number): Promise<ForgejoRepo[]> {
  const all: ForgejoRepo[] = [];
  const limit = 50;
  let page = 1;
  while (true) {
    const data = await apiFetch<{ data: ForgejoRepo[] }>(
      `/repos/search?limit=${limit}&uid=${userId}&page=${page}`,
    );
    all.push(...data.data);
    if (data.data.length < limit) break;
    page++;
  }
  return all;
}

export interface CreateRepoOptions {
  private?: boolean;
  description?: string;
}

export async function createRepo(
  name: string,
  options: CreateRepoOptions = {},
): Promise<ForgejoRepo> {
  return apiFetch<ForgejoRepo>("/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name,
      private: options.private ?? true,
      description: options.description ?? "",
      auto_init: false,
    }),
  });
}
