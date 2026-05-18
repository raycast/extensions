import { openExtensionPreferences, showToast, Toast } from "@raycast/api";
import type { Bookmark, Tag } from "./types.js";

export const NO_FOLDER = "__none__";

export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

export function showApiError(error: Error, retryFn?: () => void) {
  const isAuthError = error.message.includes("API key") || error.message.includes("scope");
  showToast({
    style: Toast.Style.Failure,
    title: error.message,
    primaryAction: isAuthError
      ? { title: "Open Preferences", onAction: openExtensionPreferences }
      : {
          title: "Retry",
          onAction: () => (retryFn ? retryFn() : undefined),
        },
  });
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function formatRelativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function getTagNames(bookmark: Bookmark): string[] {
  if (!bookmark.tags) return [];
  type TagRow = Bookmark["tags"][number];
  return bookmark.tags
    .map((t: TagRow) => t.tag?.name ?? (t as unknown as { name?: string }).name)
    .filter((n: string | undefined): n is string => Boolean(n));
}

export function isValidUrl(input: string): boolean {
  try {
    const { protocol } = new URL(input);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function formatMarkdownLink(bookmark: Bookmark): string {
  const title = bookmark.title || getDomain(bookmark.url);
  return `[${title}](${bookmark.url})`;
}

export async function resolveOrCreateTag(
  tagName: string,
  sidebar: { tags: Tag[] } | undefined,
  createTag: (name: string) => Promise<Tag>,
): Promise<string | undefined> {
  const normalizedName = tagName.trim().toLowerCase();
  if (!normalizedName) return undefined;

  try {
    const newTag = await createTag(normalizedName);
    return newTag.id;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("already exists") && sidebar) {
      const existing = sidebar.tags.find((t) => t.name.toLowerCase() === normalizedName);
      if (existing) return existing.id;
    }
    throw error;
  }
}
