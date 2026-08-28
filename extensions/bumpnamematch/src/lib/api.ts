import { showToast, Toast } from "@raycast/api";
import type { Gender, Name } from "./types";

export interface FavoriteList {
  id: string;
  name: string;
  isDefault: number;
  isArchived: number;
  isPublic: number;
}

export interface FavoriteListsResponse {
  lists: FavoriteList[];
  savedIn?: string[];
}

/**
 * An item in a favorite list. A row is either a saved name (`itemType: "name"`,
 * with the joined `names` columns populated) or a section divider
 * (`itemType: "divider"`, with a `label` and null name columns).
 */
export interface FavoriteListItem {
  itemId: string;
  itemType: "name" | "divider";
  label: string | null;
  position: number;
  // Name columns (null for dividers)
  id: number | null;
  name: string | null;
  gender: Gender | null;
  origin: string | null;
  meanings: string | null;
  currentRank: number | null;
}

export interface ListDetailResponse {
  list: FavoriteList & { ownerDisplayName?: string };
  items: FavoriteListItem[];
}

// ── Naming sessions ─────────────────────────────────────────────────────────

export interface NamingSession {
  id: string;
  creatorId: string;
  inviteCode: string;
  lastName: string | null;
  middleName: string | null;
  startsWith: string | null;
  endsWith: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SessionsListResponse {
  sessions: NamingSession[];
}

export interface SessionNamesResponse {
  names: Name[];
}

/** Cast a like/dislike vote. Returns the vote result (incl. match flag) or null on failure. */
export async function castVote(
  baseUrl: string,
  apiKey: string,
  sessionId: string,
  nameId: number,
  vote: "like" | "dislike",
): Promise<{ isMatch: boolean } | null> {
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/vote`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ nameId, vote }),
    });
    if (res.ok) {
      const data = (await res.json()) as { isMatch?: boolean };
      return { isMatch: Boolean(data.isMatch) };
    }
    await showToast({
      style: Toast.Style.Failure,
      title: res.status === 401 ? "Invalid API key" : "Failed to record vote",
    });
    return null;
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to record vote",
      message: err instanceof Error ? err.message : undefined,
    });
    return null;
  }
}

/** Load the next batch of candidate names for a session. Returns [] on failure. */
export async function loadMoreNames(baseUrl: string, apiKey: string, sessionId: string): Promise<Name[]> {
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/names`, {
      method: "POST",
      headers: authHeaders(apiKey),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as SessionNamesResponse;
    return data.names ?? [];
  } catch {
    return [];
  }
}

/** Join a session by invite code. */
export async function joinSession(
  baseUrl: string,
  apiKey: string,
  inviteCode: string,
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/sessions/join`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ inviteCode }),
    });
    const data = (await res.json().catch(() => ({}))) as { sessionId?: string; error?: string };
    if (res.ok && data.sessionId) return { ok: true, sessionId: data.sessionId };
    return { ok: false, error: data.error || (res.status === 401 ? "Invalid API key" : "Couldn't join session") };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't join session" };
  }
}

function authHeaders(apiKey: string): Record<string, string> {
  return { "x-api-key": apiKey, "Content-Type": "application/json" };
}

/** Add a name to a favorite list, with a Raycast toast for feedback. */
export async function addToList(
  baseUrl: string,
  apiKey: string,
  listId: string,
  nameId: number,
  listName: string,
): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Saving to ${listName}…` });
  try {
    const res = await fetch(`${baseUrl}/api/favorite-lists/${listId}/items`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ nameId }),
    });
    if (res.ok) {
      toast.style = Toast.Style.Success;
      toast.title = `Saved to ${listName}`;
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    toast.style = Toast.Style.Failure;
    if (res.status === 401) {
      toast.title = "Invalid API key";
      toast.message = "Check the API Key in this extension's preferences.";
    } else if (data.error === "Name already in list") {
      toast.style = Toast.Style.Success;
      toast.title = `Already in ${listName}`;
    } else {
      toast.title = data.error || "Failed to save";
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save";
    toast.message = err instanceof Error ? err.message : undefined;
  }
}

/** Remove a name from a favorite list, with a Raycast toast for feedback. */
export async function removeFromList(
  baseUrl: string,
  apiKey: string,
  listId: string,
  nameId: number,
  listName: string,
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Removing from ${listName}…` });
  try {
    const res = await fetch(`${baseUrl}/api/favorite-lists/${listId}/items/${nameId}`, {
      method: "DELETE",
      headers: authHeaders(apiKey),
    });
    if (res.ok) {
      toast.style = Toast.Style.Success;
      toast.title = `Removed from ${listName}`;
      return true;
    }
    toast.style = Toast.Style.Failure;
    toast.title = res.status === 401 ? "Invalid API key" : "Failed to remove";
    return false;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to remove";
    toast.message = err instanceof Error ? err.message : undefined;
    return false;
  }
}
