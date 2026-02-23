import { Cache, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark } from "../types";
import { fetchAllBookmarks, fetchLastUpdated, deleteBookmark as apiDeleteBookmark } from "../api";

const cache = new Cache();
const CACHE_KEY_BOOKMARKS = "pinboard_bookmarks";
const CACHE_KEY_LAST_UPDATED = "pinboard_last_updated";
const MAX_RESULTS = 100;

interface UsePinboardBookmarksOptions {
  /** Space-separated tag string (primitive = stable dependency) */
  constantTags?: string;
  readLater?: boolean;
}

interface UsePinboardBookmarksResult {
  bookmarks: Bookmark[];
  isLoading: boolean;
  setSearchText: (text: string) => void;
  removeBookmark: (bookmark: Bookmark) => Promise<void>;
}

function getCachedBookmarks(): Bookmark[] {
  const raw = cache.get(CACHE_KEY_BOOKMARKS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Bookmark[];
  } catch {
    return [];
  }
}

function setCachedBookmarks(bookmarks: Bookmark[]) {
  cache.set(CACHE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
}

function getCachedLastUpdated(): string | undefined {
  return cache.get(CACHE_KEY_LAST_UPDATED) ?? undefined;
}

function setCachedLastUpdated(timestamp: string) {
  cache.set(CACHE_KEY_LAST_UPDATED, timestamp);
}

function hasCachedBookmarks(): boolean {
  return !!cache.get(CACHE_KEY_BOOKMARKS);
}

export function usePinboardBookmarks(options?: UsePinboardBookmarksOptions): UsePinboardBookmarksResult {
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>(() => getCachedBookmarks());
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const fetchedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const lastUpdated = await fetchLastUpdated();
        const cachedLastUpdated = getCachedLastUpdated();

        if (cachedLastUpdated === lastUpdated && hasCachedBookmarks()) {
          setIsLoading(false);
          return;
        }

        const bookmarks = await fetchAllBookmarks();
        setAllBookmarks(bookmarks);
        setCachedBookmarks(bookmarks);
        setCachedLastUpdated(lastUpdated);
      } catch (error) {
        console.error("Failed to fetch bookmarks:", error);
        showToast({ title: "Failed to fetch bookmarks", message: String(error), style: Toast.Style.Failure });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const constantTags = options?.constantTags;
  const readLater = options?.readLater;

  const preFiltered = useMemo(() => {
    let result = allBookmarks;

    if (constantTags) {
      const tagSet = new Set(constantTags.split(" ").filter(Boolean));
      result = result.filter((b) => {
        const bookmarkTags = b.tags?.split(" ") ?? [];
        return bookmarkTags.some((t) => tagSet.has(t));
      });
    }

    if (readLater) {
      result = result.filter((b) => b.readLater);
    }

    return result;
  }, [allBookmarks, constantTags, readLater]);

  const bookmarks = useMemo(() => {
    if (!debouncedSearchText.trim()) {
      return preFiltered.slice(0, MAX_RESULTS);
    }

    const terms = debouncedSearchText.toLowerCase().split(/\s+/).filter(Boolean);
    const tagTerms = terms.filter((t) => t.startsWith("#")).map((t) => t.slice(1));
    const textTerms = terms.filter((t) => !t.startsWith("#"));

    const filtered = preFiltered.filter((b) => {
      if (tagTerms.length > 0) {
        const bookmarkTags = b.tags?.toLowerCase().split(" ") ?? [];
        if (!tagTerms.every((tag) => bookmarkTags.some((bt) => bt.includes(tag)))) return false;
      }

      if (textTerms.length > 0) {
        const haystack = `${b.title} ${b.url} ${b.tags ?? ""} ${b.description ?? ""}`.toLowerCase();
        if (!textTerms.every((term) => haystack.includes(term))) return false;
      }

      return true;
    });

    return filtered.slice(0, MAX_RESULTS);
  }, [preFiltered, debouncedSearchText]);

  const removeBookmark = useCallback(async (bookmark: Bookmark) => {
    const toast = await showToast({ title: "Deleting bookmark...", style: Toast.Style.Animated });

    try {
      await apiDeleteBookmark(bookmark);

      setAllBookmarks((prev) => {
        const updated = prev.filter((b) => b.id !== bookmark.id);
        setCachedBookmarks(updated);
        return updated;
      });

      toast.style = Toast.Style.Success;
      toast.title = "Successfully deleted bookmark";
    } catch (error) {
      console.error("deleteBookmark error", error);
      toast.title = "Could not delete bookmark";
      toast.message = String(error);
      toast.style = Toast.Style.Failure;
    }
  }, []);

  return { bookmarks, isLoading, setSearchText, removeBookmark };
}
