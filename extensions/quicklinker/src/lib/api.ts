import {
  API_BASE_URL,
  API_TOKEN_REGEX,
  Shortcut,
  ShortcutsApiResponse,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchShortcuts(
  apiToken: string,
  signal?: AbortSignal,
): Promise<Shortcut[]> {
  if (!API_TOKEN_REGEX.test(apiToken)) {
    throw new ApiError("Invalid API token format", 401);
  }

  const response = await fetch(`${API_BASE_URL}/api/shortcuts`, {
    signal,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = "An unexpected error occurred";
    try {
      const body = (await response.json()) as { error?: string };
      if (body && typeof body.error === "string") {
        errorMessage = body.error;
      }
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    let retryAfterSeconds: number | undefined;
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) {
        retryAfterSeconds = parseInt(retryAfter, 10);
        if (isNaN(retryAfterSeconds)) {
          retryAfterSeconds = undefined;
        }
      }
    }

    throw new ApiError(errorMessage, response.status, retryAfterSeconds);
  }

  const data = (await response.json()) as ShortcutsApiResponse;

  if (!data || !Array.isArray(data.shortcuts)) {
    throw new ApiError("Invalid API response format", 500);
  }

  return data.shortcuts;
}
