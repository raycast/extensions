import { getPreferenceValues } from "@raycast/api";

const BASE = "https://writethingsdown.com/api/v1";
export const WEB = "https://writethingsdown.com";

export function authHeaders(): Record<string, string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/** GET/POST/PATCH/DELETE against the Twos public API, throwing the API's error message. */
export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    let message = `Twos API error (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface TwosList {
  id: string;
  title: string;
  emoji: string;
}

export interface TwosThing {
  id: string;
  list_id: string | null;
  text: string;
  type: "todo" | "note" | "dash" | "number" | "bullet" | string;
  url: string;
  tags: string[];
  completed: boolean;
  created?: string;
  updated?: string;
  /** Hosted image URLs attached to this thing. */
  photos?: string[];
  /**
   * Text a vision model read out of `photos` (read-only, server-written).
   * Search matches on it, so a thing can come back whose own `text` is empty —
   * use this to label the row instead of rendering it blank.
   */
  photo_text?: string;
}

// Web URL for a list. Passing a thing id appends ?focus=<id>, which the list
// page reads to scroll to that row and flash it — so the browser action lands
// on the matched thing too, not just the top of the list.
export const listWebUrl = (listId?: string | null, thingId?: string | null) => {
  if (!listId) return `${WEB}/lists`;
  const base = `${WEB}/list/${encodeURIComponent(listId)}`;
  return thingId ? `${base}?focus=${encodeURIComponent(thingId)}` : base;
};

// Deep link into the NewTwos desktop app, which registers `twos://` as a
// protocol handler (see apps/desktop/electron/main.js listDeepLinkRoute).
// `focus` is the same thing-id hint the web list page reads.
//
// Returns null when there's no list to open: a bare `twos://` would just
// foreground the app and sit there, so callers fall back to the browser.
export const listDeepLink = (listId?: string | null, thingId?: string | null) => {
  if (!listId) return null;
  const base = `twos://list/${encodeURIComponent(listId)}`;
  return thingId ? `${base}?focus=${encodeURIComponent(thingId)}` : base;
};
