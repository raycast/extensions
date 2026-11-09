/** Query results are owned by their search/filter/library identity. */
import { useCallback, useEffect, useRef, useState } from "react";
import { queryAll, status, statusText } from "../helper";
import { collectionQuery, toBookmark } from "../helpers/me";
import { session } from "../session";
import type { Bookmark, BookmarksParams } from "../types";

export function useBookmarks({ collection, search = "" }: BookmarksParams, enabled = true) {
  const key = JSON.stringify([collection, search.trim()]);
  const [result, setResult] = useState<{
    key: string;
    libraryId: string;
    items: Bookmark[];
    state: string;
  }>();
  const [failed, setFailed] = useState<{ key: string; message: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const controller = useRef<AbortController | undefined>(undefined);
  const fetchAll = useCallback(
    async (reportFailure = false) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      if (!enabled) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const active = await session();
        if (current.signal.aborted) return;
        setResult((previous) =>
          previous?.libraryId === active.libraryId && previous.key === key ? previous : undefined,
        );
        const [collection, search] = JSON.parse(key) as [string, string];
        const [rows, library] = await Promise.all([
          queryAll(
            active,
            { ...collectionQuery(collection), ...(search ? { q: search } : {}) },
            current.signal,
          ),
          status(active).catch(() => undefined),
        ]);
        if (current.signal.aborted) return;
        setResult({
          key,
          libraryId: active.libraryId,
          items: rows.items.map((entity) => toBookmark(entity, new Map())),
          state: library ? statusText(library) : "Sync status unavailable",
        });
        setFailed(undefined);
      } catch (cause) {
        if (
          !current.signal.aborted &&
          cause instanceof Error &&
          "code" in cause &&
          cause.code === "LIBRARY_MISMATCH"
        )
          setResult(undefined);
        if (!current.signal.aborted)
          setFailed({ key, message: cause instanceof Error ? cause.message : String(cause) });
        if (reportFailure && !current.signal.aborted) throw cause;
      } finally {
        if (!current.signal.aborted) setIsLoading(false);
      }
    },
    [key, enabled],
  );
  useEffect(() => {
    void fetchAll();
    return () => controller.current?.abort();
  }, [fetchAll]);
  const visible = enabled && result?.key === key ? result : undefined;
  const error = enabled && failed?.key === key ? failed.message : undefined;
  return {
    isLoading,
    data: { items: visible?.items ?? [] },
    revalidate: useCallback(() => fetchAll(true), [fetchAll]),
    state: error
      ? visible?.items.length
        ? "Refresh failed · Showing previous results"
        : "Read failed"
      : (visible?.state ?? ""),
    error,
  };
}
