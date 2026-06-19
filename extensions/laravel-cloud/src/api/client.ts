import { getPreferenceValues } from "@raycast/api";
import { ApiError } from "../types/api";

const BASE_URL = "https://cloud.laravel.com/api";

export class LaravelCloudError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "LaravelCloudError";
    this.status = status;
    this.errors = errors;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errors: Record<string, string[]> | undefined;

    try {
      const body = (await response.json()) as ApiError;
      if (body.message) errorMessage = body.message;
      if (body.errors) errors = body.errors;
    } catch {
      // ignore parse errors
    }

    throw new LaravelCloudError(errorMessage, response.status, errors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  const { apiToken } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${apiToken}`,
    Accept: "application/vnd.api+json",
    "Content-Type": "application/json",
  };
}

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response);
}

export async function apiPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  await handleResponse<void>(response);
}
