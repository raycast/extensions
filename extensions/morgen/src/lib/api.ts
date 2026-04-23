import { getPreferenceValues } from "@raycast/api";
import type { CreateTaskInput } from "./types";

const BASE = "https://api.morgen.so/v3";

export async function morgenFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `ApiKey ${apiKey}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Morgen API ${res.status}: ${body || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function createTask(body: CreateTaskInput) {
  return morgenFetch<{ data: { id: string } }>("/tasks/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
