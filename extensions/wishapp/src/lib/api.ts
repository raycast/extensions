import { getPreferenceValues } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { API_BASE } from "./constants";
import type { Wishlist, WishlistsResponse } from "./types";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      "x-api-key": apiKey,
    },
  });

  if (res.status === 401) throw new UnauthorizedError();

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
  }

  return (await res.json()) as T;
}

/**
 * A rejected API key swaps the whole view for the invalid-key screen; anything
 * else is just a toast. Pass this as `useCachedPromise`'s `onError` so it
 * replaces the hook's own "Failed to fetch latest data" toast rather than
 * stacking a second one on top of it.
 */
export function handleApiError(error: unknown, title: string, onUnauthorized: () => void): void {
  if (error instanceof UnauthorizedError) onUnauthorized();
  else showFailureToast(error, { title });
}

/**
 * Both commands open on the same wishlist list, split into the same two
 * sections. `sections` keeps the display order; `wishlists` is the flat view
 * for lookups and emptiness checks.
 */
export function useWishlists(onUnauthorized: () => void) {
  const { data, isLoading, revalidate } = useCachedPromise(() => apiFetch<WishlistsResponse>("/api/v1/wishlists"), [], {
    keepPreviousData: true,
    onError: (error) => handleApiError(error, "Could not load wishlists", onUnauthorized),
  });

  const sections: [string, Wishlist[]][] = [
    ["My Wishlists", data?.ownedWishlists ?? []],
    ["Shared with Me", data?.sharedWishlists ?? []],
  ];

  return {
    sections,
    wishlists: sections.flatMap(([, sectionWishlists]) => sectionWishlists),
    isLoading,
    revalidate,
  };
}
