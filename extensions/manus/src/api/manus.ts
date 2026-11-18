import { getApiKey } from "../lib/preferences";
import { GetTasksParams, GetTasksResponse } from "./types";

const BASE_URL = "https://api.manus.ai";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getTasks(
  params: GetTasksParams = {},
): Promise<GetTasksResponse> {
  const apiKey = getApiKey();
  const url = new URL("/v1/tasks", BASE_URL);

  if (params.query) url.searchParams.set("query", params.query);
  if (params.after) url.searchParams.set("after", params.after);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.status?.length) {
    params.status.forEach((s) => url.searchParams.append("status", s));
  }

  const response = await fetch(url.toString(), {
    headers: { API_KEY: apiKey },
  });

  if (response.status === 401 || response.status === 403) {
    throw new AuthError("Invalid or expired API key");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
