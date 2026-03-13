import {
  AuthenticationError,
  GitHubRequestError,
  RateLimitError,
} from "./errors";
import {
  CreateGistInput,
  GitHubGistResponse,
  GistFileRecord,
  GistRecord,
} from "./types";

const GITHUB_API_BASE = "https://api.github.com";

function buildHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `token ${token}`,
    "User-Agent": "raycast-github-gist-explorer",
  };
}

async function requestJson<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(token),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new RateLimitError();
    }
    throw new AuthenticationError();
  }

  if (!response.ok) {
    throw new GitHubRequestError(
      response.status,
      `GitHub request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

async function request(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(token),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new RateLimitError();
    }
    throw new AuthenticationError();
  }

  if (!response.ok) {
    throw new GitHubRequestError(
      response.status,
      `GitHub request failed with status ${response.status}`,
    );
  }

  return response;
}

export async function fetchRawFileContent(rawUrl: string): Promise<string> {
  const response = await fetch(rawUrl);
  if (!response.ok) {
    throw new GitHubRequestError(
      response.status,
      `Raw content request failed with status ${response.status}`,
    );
  }
  return response.text();
}

export function normalizeGist(apiGist: GitHubGistResponse): GistRecord {
  const files: GistFileRecord[] = Object.values(apiGist.files ?? {})
    .filter((file): file is NonNullable<typeof file> => Boolean(file))
    .map((file) => ({
      filename: file.filename ?? "untitled",
      language: file.language ?? null,
      rawUrl: file.raw_url ?? "",
      size: file.size ?? 0,
      truncated: Boolean(file.truncated),
      content: file.content,
      type: file.type,
    }));

  return {
    id: apiGist.id,
    description: apiGist.description ?? "",
    htmlUrl: apiGist.html_url,
    public: apiGist.public,
    createdAt: apiGist.created_at,
    updatedAt: apiGist.updated_at,
    files,
  };
}

export async function getGist(
  token: string,
  gistId: string,
): Promise<GistRecord> {
  const response = await requestJson<GitHubGistResponse>(
    `${GITHUB_API_BASE}/gists/${gistId}`,
    token,
  );

  return normalizeGist(response);
}

export async function listAllGists(token: string): Promise<GistRecord[]> {
  const perPage = 100;
  const gists: GistRecord[] = [];

  for (let page = 1; ; page += 1) {
    const pageData = await requestJson<GitHubGistResponse[]>(
      `${GITHUB_API_BASE}/gists?per_page=${perPage}&page=${page}`,
      token,
    );
    gists.push(...pageData.map(normalizeGist));

    if (pageData.length < perPage) {
      break;
    }
  }

  return gists;
}

export async function createGist(
  token: string,
  input: CreateGistInput,
): Promise<GistRecord> {
  const response = await requestJson<GitHubGistResponse>(
    `${GITHUB_API_BASE}/gists`,
    token,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: input.description,
        public: input.isPublic,
        files: {
          [input.filename]: {
            content: input.content,
          },
        },
      }),
    },
  );

  return normalizeGist(response);
}

export async function deleteGist(token: string, gistId: string): Promise<void> {
  await request(`${GITHUB_API_BASE}/gists/${gistId}`, token, {
    method: "DELETE",
  });
}
