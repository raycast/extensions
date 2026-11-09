/** Query results are owned by their search/filter/library identity. */
import { usePromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { queryAll, status, statusText } from "../helper";
import { collectionQuery, toBookmark } from "../helpers/me";
import { session } from "../session";
import type { Bookmark, BookmarksParams } from "../types";

export function useBookmarks({ collection, search = "" }: BookmarksParams, enabled = true) {
  const key = JSON.stringify([collection, search.trim()]);
  // usePromise clears data on error. Retain only a successful result belonging
  // to the current query and library so a failed refresh stays useful.
  const [result, setResult] = useState<{
    key: string;
    libraryId: string;
    items: Bookmark[];
    state: string;
  }>();
  const [failed, setFailed] = useState<{ key: string; message: string }>();
  const abortable = useRef<AbortController | undefined>(undefined);
  const request = usePromise(
    async (queryKey: string) => {
      const signal = abortable.current?.signal;
      const active = await session();
      signal?.throwIfAborted();
      setResult((previous) =>
        previous?.libraryId === active.libraryId && previous.key === queryKey ? previous : undefined,
      );
      const [collection, search] = JSON.parse(queryKey) as [string, string];
      const [rows, library] = await Promise.all([
        queryAll(active, { ...collectionQuery(collection), ...(search ? { q: search } : {}) }, signal),
        status(active).catch(() => undefined),
      ]);
      return {
        key: queryKey,
        libraryId: active.libraryId,
        items: rows.items.map((entity) => toBookmark(entity, new Map())),
        state: library ? statusText(library) : "Sync status unavailable",
      };
    },
    [key],
    {
      execute: enabled,
      abortable,
      onData: (data) => {
        setResult(data);
        setFailed(undefined);
      },
      onError: (cause) => {
        if ("code" in cause && cause.code === "LIBRARY_MISMATCH") setResult(undefined);
        setFailed({ key, message: cause.message });
      },
    },
  );
  const revalidate = useCallback(async () => {
    if (!enabled) return;
    const value = await request.revalidate();
    // Raycast usePromise resolves with Error after reporting a rejected read.
    if (value instanceof Error) throw value;
  }, [enabled, request.revalidate]);
  const visible = enabled && result?.key === key ? result : undefined;
  const error = enabled && failed?.key === key ? failed.message : undefined;
  return {
    isLoading: request.isLoading,
    data: { items: visible?.items ?? [] },
    revalidate,
    state: error
      ? visible?.items.length
        ? "Refresh failed · Showing previous results"
        : "Read failed"
      : (visible?.state ?? ""),
    error,
  };
}
