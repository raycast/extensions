import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { MESSAGES } from "../constants";
import type { ListItem, Snippet } from "../types";

const preferences = getPreferenceValues<Preferences>();
const PORT = parseInt(preferences.port, 10) || 4321;

// massCode listens on IPv4 loopback only, localhost may resolve to ::1
export const API_URL = `http://127.0.0.1:${PORT}`;
export const API_HEADERS = { Authorization: `Bearer ${preferences.token.trim()}` };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message =
    typeof body?.message === "string" && body.message ? body.message : MESSAGES.API_ERROR(response.status);

  throw new ApiError(message, response.status);
}

export async function fetchSnippet(id: number) {
  const response = await fetch(`${API_URL}/snippets/${id}`, { headers: API_HEADERS });
  return parseResponse<Snippet>(response);
}

// undefined: not loaded yet, null: fragment is unavailable
export function getFragmentValue(item: ListItem, snippet?: Snippet): string | null | undefined {
  if (item.value !== undefined) {
    return item.value;
  }

  if (snippet?.id !== item.snippetId) {
    return undefined;
  }

  return snippet.contents.find((content) => content.id === item.contentId)?.value ?? null;
}

export async function showApiError(error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    await showToast({
      style: Toast.Style.Failure,
      title: MESSAGES.UNAUTHORIZED,
      message: MESSAGES.UNAUTHORIZED_HINT,
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }

  await showToast(Toast.Style.Failure, error instanceof ApiError ? error.message : MESSAGES.ERROR);
}
