export type BookCover = {
  path?: string;
  width: number;
  height: number;
  loading: boolean;
};

export const PENDING_COVER: BookCover = { width: 160, height: 240, loading: true };
export const MISSING_COVER: BookCover = { width: 160, height: 240, loading: false };

// Commit complete cover updates together, including when all covers are already cached.
export async function loadBookCovers(
  urls: string[],
  loadCover: (url: string, signal?: AbortSignal) => Promise<Omit<BookCover, "loading">>,
  onBatch: (covers: Record<string, BookCover>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const pending = [...new Set(urls)].filter((url) => url && url !== "N/A");
  const covers: Record<string, BookCover> = {};
  let next = 0;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    if (!dirty || signal?.aborted) return;
    dirty = false;
    onBatch({ ...covers });
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    await Promise.all(
      Array.from({ length: Math.min(4, pending.length) }, async () => {
        while (!signal?.aborted && next < pending.length) {
          const url = pending[next++];
          let cover: BookCover;
          try {
            cover = { ...(await loadCover(url, signal)), loading: false };
          } catch {
            cover = MISSING_COVER;
          }
          if (signal?.aborted) return;
          covers[url] = cover;
          dirty = true;
          if (!timer) timer = setTimeout(flush, 100);
        }
      }),
    );
    cancel();
    flush();
  } finally {
    cancel();
    signal?.removeEventListener("abort", cancel);
  }
}
