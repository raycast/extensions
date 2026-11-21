import { getAccessToken, resetOAuthSession } from "./auth";
import { parseRateLimit } from "./rate-limit";
import { Board, Me, RateLimit, Save, SavesPage } from "./types";

const API_URL = "https://api.savee.com/v1/";
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_PAGE_SIZE = 30;

export class SaveeError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "SaveeError";
  }
}

type Query = Record<string, string | number | undefined>;

type ApiResult<T> = {
  data: T;
  rateLimits: RateLimit[];
};

async function toSaveeError(response: Response): Promise<SaveeError> {
  const retryAfter = Number(response.headers.get("Retry-After"));
  let code = "HTTP_" + response.status;
  let message = response.statusText || "Savee request failed";

  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    code = body.error?.code ?? code;
    message = body.error?.message ?? message;
  } catch {
    // Not JSON: keep the HTTP status
  }

  return new SaveeError(message, code, response.status, Number.isFinite(retryAfter) ? retryAfter : undefined);
}

async function request<T>(path: string, query: Query = {}): Promise<ApiResult<T>> {
  const token = await getAccessToken();
  const url = new URL(path, API_URL);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      // JPG instead of AVIF, so images render, copy and paste everywhere
      "Avif-Fallback": "1",
    },
  });

  if (!response.ok) {
    const error = await toSaveeError(response);
    if (error.status === 401) {
      await resetOAuthSession();
    }
    throw error;
  }

  return { data: (await response.json()) as T, rateLimits: parseRateLimit(response.headers.get("RateLimit")) };
}

function id(value: string): string {
  return encodeURIComponent(value.trim());
}

export async function getMe(): Promise<Me> {
  return (await request<Me>("me")).data;
}

export async function listSaves(cursor?: string, limit = MAX_PAGE_SIZE): Promise<SavesPage> {
  return (await request<SavesPage>("saves", { cursor, limit })).data;
}

export async function listFeed(cursor?: string, limit = MAX_PAGE_SIZE): Promise<SavesPage> {
  return (await request<SavesPage>("feed", { cursor, limit })).data;
}

export async function getSave(saveId: string): Promise<Save> {
  return (await request<{ data: Save }>("saves/" + id(saveId))).data.data;
}

export async function listBoards(): Promise<Board[]> {
  return (await request<{ data: Board[] }>("boards")).data.data;
}

export async function getBoard(boardId: string): Promise<Board> {
  return (await request<{ data: Board }>("boards/" + id(boardId))).data.data;
}

export async function listBoardSaves(boardId: string, cursor?: string, limit = MAX_PAGE_SIZE): Promise<SavesPage> {
  return (await request<SavesPage>("boards/" + id(boardId) + "/saves", { cursor, limit })).data;
}

export async function searchLibrary(
  query: string,
  cursor?: string,
  limit = MAX_SEARCH_PAGE_SIZE,
): Promise<ApiResult<SavesPage>> {
  return request<SavesPage>("search", { query: query.trim(), cursor, limit: Math.min(limit, MAX_SEARCH_PAGE_SIZE) });
}
