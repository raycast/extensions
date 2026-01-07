import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiToken: string;
  defaultAssignee?: string;
  defaultAccountId?: string;
  defaultProjectId?: string;
}

const BASE_URL = "https://api.usepylon.com";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiToken(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiToken;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getApiToken();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    if (response.status === 401) {
      throw new ApiError("Invalid API token. Please check your preferences.", response.status, body);
    }

    if (response.status === 400) {
      const errorMessage =
        typeof body === "object" && body !== null && "message" in body
          ? String((body as { message: string }).message)
          : "Validation error";
      throw new ApiError(errorMessage, response.status, body);
    }

    throw new ApiError(`API request failed: ${response.statusText}`, response.status, body);
  }

  return response.json();
}

export async function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: "GET" });
}

export async function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function patch<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
