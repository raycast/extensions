import { environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { useEffect, useRef, useState } from "react";
import type { DocsSearchResult } from "./types";

const BOOKMARKS_CACHE_KEY = "craft-docs-bookmarks";
const BOOKMARKS_FILE_PATH = path.join(environment.supportPath, "bookmarks.json");

export function usePersistentBookmarks() {
  const [bookmarks, setBookmarks] = useCachedState<DocsSearchResult[]>(BOOKMARKS_CACHE_KEY, []);
  const [hasHydrated, setHasHydrated] = useState(false);
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateBookmarks() {
      const fileBookmarks = await readBookmarksFromFile();
      if (cancelled) return;

      const serializedFileBookmarks = serializeBookmarks(fileBookmarks);
      lastSavedRef.current = serializedFileBookmarks;

      if (serializedFileBookmarks && serializedFileBookmarks !== serializeBookmarks(bookmarks ?? [])) {
        setBookmarks(fileBookmarks);
      }

      setHasHydrated(true);
    }

    void hydrateBookmarks();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const nextBookmarks = bookmarks ?? [];
    const serialized = serializeBookmarks(nextBookmarks);
    if (serialized === lastSavedRef.current) return;

    lastSavedRef.current = serialized;
    void writeBookmarksToFile(nextBookmarks);
  }, [bookmarks, hasHydrated]);

  return [bookmarks, setBookmarks] as const;
}

async function readBookmarksFromFile(): Promise<DocsSearchResult[]> {
  try {
    const raw = await readFile(BOOKMARKS_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DocsSearchResult[]) : [];
  } catch {
    return [];
  }
}

async function writeBookmarksToFile(bookmarks: DocsSearchResult[]) {
  try {
    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(BOOKMARKS_FILE_PATH, `${serializeBookmarks(bookmarks)}\n`, "utf8");
  } catch {
    // ignore bookmark persistence failures
  }
}

function serializeBookmarks(bookmarks: DocsSearchResult[]): string {
  return JSON.stringify(bookmarks);
}
