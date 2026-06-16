import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "sessions";

export interface Bookmark {
  id: string;
  url: string;
  label: string;
  repo?: string;
  /** Extracted claude.ai session id, when the URL contains one. */
  sessionId?: string;
  addedAt: number;
  lastOpenedAt?: number;
}

export interface ParsedUrl {
  valid: boolean;
  url: string;
  sessionId?: string;
}

/**
 * Validate and normalize a Claude session URL and pull out its session id.
 * Accepts links like https://claude.ai/code/session_… (or cse_…).
 */
export function parseSessionUrl(input: string): ParsedUrl {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed.replace(/^http:\/\//i, "https://"));
  } catch {
    return { valid: false, url: trimmed };
  }
  // Require an actual session id segment — a bare https://claude.ai/code landing
  // page is not a session and shouldn't be bookmarkable.
  const match = url.pathname.match(/\/code\/((?:session|cse)_[A-Za-z0-9]+)/);
  const isClaude = url.hostname === "claude.ai" && match !== null;
  return { valid: isClaude, url: url.toString(), sessionId: match?.[1] };
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Bookmark[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(bookmarks: Bookmark[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export interface BookmarkInput {
  url: string;
  label: string;
  repo?: string;
}

/** Add a bookmark, or update the existing one if the same session id is already saved. */
export async function addBookmark(input: BookmarkInput): Promise<Bookmark> {
  const parsed = parseSessionUrl(input.url);
  const bookmarks = await getBookmarks();

  const existing = parsed.sessionId
    ? bookmarks.find((b) => b.sessionId === parsed.sessionId)
    : bookmarks.find((b) => b.url === parsed.url);

  if (existing) {
    existing.url = parsed.url;
    existing.label = input.label.trim() || existing.label;
    existing.repo = input.repo?.trim() || existing.repo;
    await save(bookmarks);
    return existing;
  }

  const bookmark: Bookmark = {
    id: parsed.sessionId ?? `b_${Date.now()}`,
    url: parsed.url,
    label: input.label.trim() || parsed.sessionId || "Claude session",
    repo: input.repo?.trim() || undefined,
    sessionId: parsed.sessionId,
    addedAt: Date.now(),
  };
  await save([bookmark, ...bookmarks]);
  return bookmark;
}

export async function updateBookmark(id: string, patch: Partial<BookmarkInput>): Promise<void> {
  const bookmarks = await getBookmarks();
  const target = bookmarks.find((b) => b.id === id);
  if (!target) return;
  if (patch.url !== undefined) {
    const parsed = parseSessionUrl(patch.url);
    // Don't let an edit point this bookmark at a session another bookmark already holds.
    if (parsed.sessionId && bookmarks.some((b) => b.id !== id && b.sessionId === parsed.sessionId)) {
      throw new Error("Another saved session already uses that link.");
    }
    target.url = parsed.url;
    target.sessionId = parsed.sessionId;
  }
  if (patch.label !== undefined) target.label = patch.label.trim() || target.label;
  if (patch.repo !== undefined) target.repo = patch.repo.trim() || undefined;
  await save(bookmarks);
}

export async function removeBookmark(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  await save(bookmarks.filter((b) => b.id !== id));
}

export async function markOpened(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  const target = bookmarks.find((b) => b.id === id);
  if (!target) return;
  target.lastOpenedAt = Date.now();
  await save(bookmarks);
}
