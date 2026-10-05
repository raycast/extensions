import { useEffect, useMemo, useState } from "react";

import { environment, getPreferenceValues } from "@raycast/api";

import type { BookEntry, LibgenPreferences } from "@/types";
import { getCachedFullSizeBookCover } from "@/utils/api/covers";
import { type BookCover, loadBookCovers } from "@/utils/book-covers";
import { getCoverPreviewSize } from "@/utils/cover-preview";

export const useBookCovers = (books: BookEntry[]) => {
  const { preferredLibgenMirror } = useMemo(() => getPreferenceValues<LibgenPreferences>(), []);
  const source = useMemo(() => JSON.stringify([...new Set(books.map((book) => book.coverUrl))]), [books]);
  const [state, setState] = useState<{ source: string; covers: Record<string, BookCover> }>();

  useEffect(() => {
    const controller = new AbortController();
    void loadBookCovers(
      JSON.parse(source) as string[],
      async (url, signal) => {
        const path = await getCachedFullSizeBookCover(url, environment.supportPath, signal, preferredLibgenMirror);
        const size = await getCoverPreviewSize(path, signal).catch(() => ({ width: 160, height: 240 }));
        return { path, ...size };
      },
      (covers) => {
        if (!controller.signal.aborted) setState({ source, covers });
      },
      controller.signal,
    );
    return () => controller.abort();
  }, [source, preferredLibgenMirror]);

  return state?.source === source ? state.covers : undefined;
};
