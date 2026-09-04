import { getAuth } from "./auth";
import { httpRequest } from "./http";
import type { Board, UpdateRequest, UpdateResponse } from "./types";

const API_BASE = "https://api.pushtodisplay.com";
const SERVICES_BASE = "https://services.pushtodisplay.com";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  headers: Record<string, string>,
  base = API_BASE,
): Promise<T> {
  const { status, text } = await httpRequest(
    init.method ?? "GET",
    `${base}${path}`,
    headers,
    typeof init.body === "string" ? init.body : undefined,
  );
  if (status < 200 || status >= 300) {
    let detail = `Request failed (${status})`;
    try {
      const body = JSON.parse(text) as { error?: string; message?: string };
      detail = body.error ?? body.message ?? detail;
    } catch {
      // non-JSON error body — keep default detail
      if (text.trim().length > 0) {
        detail = text.trim().slice(0, 300);
      }
    }
    throw new ApiError(status, detail);
  }
  if (status === 204) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(status, `Invalid JSON response: ${text.slice(0, 200)}`);
  }
}

/** Send an update to a board (boards/panels/styling per UpdateRequest). */
export async function sendUpdate(req: UpdateRequest): Promise<UpdateResponse> {
  const auth = await getAuth();
  return request<UpdateResponse>(
    "/v1/updates",
    { method: "POST", body: JSON.stringify(req) },
    { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
  );
}

/** List the user's boards (for the board picker). */
export async function fetchBoards(): Promise<Board[]> {
  const auth = await getAuth();
  // Boards live on the services host (CLI listBoards -> serviceUrl).
  const data = (await request<unknown>(
    "/v1/boards",
    { method: "GET" },
    { Authorization: `Bearer ${auth.accessToken}` },
    SERVICES_BASE,
  )) as Array<Record<string, unknown>> | { boards: Array<Record<string, unknown>> };
  const list = Array.isArray(data) ? data : (data.boards ?? []);
  return list.map((b) => ({
    id: String(b.id ?? b.boardId ?? ""),
    name: String(b.name ?? b.title ?? ""),
    isDefault: Boolean(b.isDefault),
  }));
}
