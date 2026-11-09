import { usePromise } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildCollectionsOptions } from "../helpers/collections";
import { useBookmarks } from "./useBookmarks";
import { useCollections } from "./useCollections";

/** One persisted collection selection per library; collection options are always read fresh. */
export function useRequest(search: string) {
  const collections = useCollections();
  const [selection, setSelection] = useState<{ libraryId: string; value: string }>();
  const [selectionError, setSelectionError] = useState<string>();
  const storageKey = collections.libraryId ? `me.collection.${collections.libraryId}` : undefined;
  // Existing filters are raw strings; usePromise preserves that format and
  // exposes read errors without migrating LocalStorage to JSON values.
  const stored = usePromise(
    async (libraryId: string | undefined) => ({
      libraryId: libraryId!,
      value: (await LocalStorage.getItem<string>(`me.collection.${libraryId}`)) ?? "0",
    }),
    [collections.libraryId],
    {
      execute: !!collections.libraryId,
      onData: (value) => setSelection((current) => (current?.libraryId === value.libraryId ? current : value)),
      onError: (error) => {
        if (collections.libraryId) setSelection({ libraryId: collections.libraryId, value: "0" });
        setSelectionError(`Cannot restore collection filter: ${error.message}`);
      },
    },
  );
  const options = useMemo(
    () => (collections.data ? buildCollectionsOptions(collections.data) : []),
    [collections.data],
  );
  const selected = selection?.libraryId === collections.libraryId ? (selection?.value ?? "0") : "0";
  const valid =
    !collections.data || ["0", "-1", "-99"].includes(selected) || options.some((item) => item.value === selected);
  const collection = valid ? selected : "0";
  const setCollection = useCallback(
    (value: string) => {
      if (!storageKey || !collections.libraryId) return;
      setSelection({ libraryId: collections.libraryId, value });
      void LocalStorage.setItem(storageKey, value).then(
        () => setSelectionError(undefined),
        (error) => setSelectionError(`Cannot remember collection filter: ${String(error)}`),
      );
    },
    [storageKey, collections.libraryId],
  );
  useEffect(() => {
    if (!valid && collections.data) setCollection("0");
  }, [valid, collections.data, setCollection]);
  const bookmarks = useBookmarks(
    { collection, search },
    (selection?.libraryId === collections.libraryId && !!selection) || !!collections.error,
  );
  const names = useMemo(
    () => new Map((collections.data?.items ?? []).map((item) => [item._id, item.title])),
    [collections.data],
  );
  const items = bookmarks.data.items.map((bookmark) => ({
    ...bookmark,
    collection: {
      ...bookmark.collection,
      title: bookmark.collection.$id ? (names.get(bookmark.collection.$id) ?? "Collection unavailable") : "Unsorted",
    },
  }));
  const revalidate = useCallback(async () => {
    const results = await Promise.allSettled([collections.revalidate(), bookmarks.revalidate()]);
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
      if (result.value instanceof Error) throw result.value;
    }
  }, [collections.revalidate, bookmarks.revalidate]);
  return {
    isLoading: bookmarks.isLoading || collections.isLoading || stored.isLoading,
    isLoadingCollections: collections.isLoading,
    bookmarks: { items },
    collections: options,
    collection,
    setCollection,
    revalidate,
    state: bookmarks.state,
    error: bookmarks.error ?? collections.error?.message ?? selectionError,
    stale: !!bookmarks.error && items.length > 0,
  };
}
