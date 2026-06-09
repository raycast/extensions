import { clearToken, getToken } from "./auth";
import { API_BASE } from "./types";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new UnauthorizedError();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Origin: API_BASE,
    },
  });

  if (res.status === 401) {
    await clearToken();
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
  }

  return (await res.json()) as T;
}
