import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { CACHE_KEYS, cache } from "@/constants";
import { hideIfDefined } from "@/helper/cache";
import { getNotes } from "@/lib/dcli";
import { VaultNote } from "@/types/dcli";

export function useCachedNotes() {
  const { data, isLoading, revalidate } = usePromise(getNotes);
  const [notes, setNotes] = useState(getCachedNotes());
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  useEffect(() => {
    if (data) {
      setNotes(data);
      setCachedNotes(data);
      setIsInitialLoaded(true);
    }
  }, [data]);

  return {
    notes,
    isLoading,
    isInitialLoaded,
    revalidate,
  };
}

function getCachedNotes(): VaultNote[] | undefined {
  try {
    const cached = cache.get(CACHE_KEYS.NOTES);
    return cached ? JSON.parse(cached) : undefined;
  } catch (_) {
    cache.remove(CACHE_KEYS.NOTES);
  }
}

function setCachedNotes(notes: VaultNote[]) {
  const cleaned = notes.map((item) => ({
    ...item,
    content: hideIfDefined(item.content),
  }));
  cache.set(CACHE_KEYS.NOTES, JSON.stringify(cleaned));
}
