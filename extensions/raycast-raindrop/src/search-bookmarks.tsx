import { useState, useEffect, useCallback, useRef } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { searchBookmarks } from "./api";
import { loadRecentBookmarks, pushRecentBookmark } from "./storage";
import type { RaindropBookmark } from "./types";

// Simple debounce hook
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Lightweight fuzzy search over cached bookmarks (no external dependency)
function fuzzyMatch(
  bookmarks: RaindropBookmark[],
  query: string,
): RaindropBookmark[] {
  const q = query.toLowerCase();
  return bookmarks.filter((b) => {
    const hay =
      `${b.title} ${b.note} ${b.excerpt} ${b.link} ${b.tags.join(" ")}`.toLowerCase();
    // Substring match + character-by-character fuzzy
    if (hay.includes(q)) return true;
    let idx = 0;
    for (const ch of q) {
      idx = hay.indexOf(ch, idx);
      if (idx === -1) return false;
      idx++;
    }
    return true;
  });
}

// Reorder results: recently-used items float to top
function sortByMRU(
  items: RaindropBookmark[],
  recentIds: Set<number>,
): RaindropBookmark[] {
  const top = items.filter((b) => recentIds.has(b._id));
  const rest = items.filter((b) => !recentIds.has(b._id));
  return [...top, ...rest];
}

export default function SearchBookmarks() {
  const [searchText, setSearchText] = useState("");
  const [bookmarks, setBookmarks] = useState<RaindropBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const recentRef = useRef<RaindropBookmark[]>([]);
  const recentIdsRef = useRef<Set<number>>(new Set());

  const debouncedSearchText = useDebounce(searchText, 300);

  // Load recent bookmarks on mount (build MRU index)
  useEffect(() => {
    async function load() {
      try {
        const recent = await loadRecentBookmarks();
        recentRef.current = recent;
        recentIdsRef.current = new Set(recent.map((b) => b._id));
        setBookmarks(recent);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Search logic: local first → API replaces with MRU sorting
  useEffect(() => {
    if (!debouncedSearchText.trim()) {
      // Empty query: show recent bookmarks
      setBookmarks(recentRef.current);
      return;
    }

    let cancelled = false;

    // Phase 1: Instant local fuzzy search
    const localResults = fuzzyMatch(recentRef.current, debouncedSearchText);
    if (localResults.length > 0) {
      setBookmarks(localResults);
    }

    // Phase 2: Async API search (replaces local results)
    setIsLoading(true);
    searchBookmarks(debouncedSearchText)
      .then((res) => {
        if (cancelled) return;
        if (res.result) {
          setBookmarks(sortByMRU(res.items, recentIdsRef.current));
        } else {
          showToast({ style: Toast.Style.Failure, title: "Search failed" });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep local results on API error — don't disrupt user
        if (localResults.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: String(err),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchText]);

  const handleOpen = useCallback(async (bookmark: RaindropBookmark) => {
    // Update MRU cache
    await pushRecentBookmark(bookmark);
    recentRef.current = [
      bookmark,
      ...recentRef.current.filter((b) => b._id !== bookmark._id),
    ].slice(0, 100);
    recentIdsRef.current = new Set(recentRef.current.map((b) => b._id));
  }, []);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Raindrop.io bookmarks…"
      throttle
      filtering={false}
    >
      {bookmarks.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Bookmarks Found"
          description={
            searchText
              ? "Try a different search term"
              : "Your recent bookmarks will appear here"
          }
          icon={Icon.Bookmark}
        />
      ) : (
        bookmarks.map((bookmark) => (
          <List.Item
            key={bookmark._id}
            id={String(bookmark._id)}
            title={bookmark.title}
            subtitle={bookmark.note || bookmark.excerpt || undefined}
            icon={
              bookmark.cover || bookmark.highLevel?.cover
                ? { source: bookmark.cover || bookmark.highLevel?.cover || "" }
                : Icon.Globe
            }
            accessories={bookmark.domain ? [{ text: bookmark.domain }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Open Bookmark"
                  icon={Icon.Globe}
                  onAction={async () => {
                    await handleOpen(bookmark);
                    await open(bookmark.link);
                  }}
                />
                <Action
                  title="Copy URL"
                  icon={Icon.Clipboard}
                  onAction={() => Clipboard.copy(bookmark.link)}
                />
                <Action
                  title="Copy Title & URL"
                  icon={Icon.Clipboard}
                  onAction={() =>
                    Clipboard.copy(`${bookmark.title}\n${bookmark.link}`)
                  }
                />
                <Action.OpenInBrowser
                  title="Open in Raindrop"
                  url={`https://app.raindrop.io/my/${bookmark._id}`}
                />
                <ActionPanel.Section title="Details">
                  <Action.CopyToClipboard
                    title="Copy Tags"
                    content={bookmark.tags.join(", ")}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
