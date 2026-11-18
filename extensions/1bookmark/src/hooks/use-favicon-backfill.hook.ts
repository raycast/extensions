import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import ms from "ms";
import { RouterOutputs, trpc } from "@/utils/trpc.util";
import { resolveFaviconUrl } from "@/utils/favicon.util";

type Bookmark = RouterOutputs["bookmark"]["listAll"][number];

const RETRY_AFTER_MS = ms("4h");
const CONCURRENCY = 5;
const BATCH_REPORT_SIZE = 20;
// At or above this attempt count the bookmark is treated as a permanent failure and not retried.
const MAX_ATTEMPT_COUNT = 20;

function needsBackfill(b: Bookmark, now: number): boolean {
  if (b.faviconUrl) return false;
  if (b.faviconAttemptCount >= MAX_ATTEMPT_COUNT) return false;
  if (!b.faviconAttemptedAt) return true;
  return now - new Date(b.faviconAttemptedAt).getTime() > RETRY_AFTER_MS;
}

// Scans the bookmark list, resolves favicons on the client for entries with an empty favicon, and
// reports them to the server. An id that has been processed once is not retried for the lifetime of
// the process (prevents duplicate requests across sessions). The listAll cache is optimistically
// updated at the same time as the server report so the UI reflects the change immediately.
//
// Caution: the object returned by useMutation gets a new reference whenever its state (isPending, etc.)
// changes, so putting it in deps would trigger the effect cleanup and kill the in-progress backfill.
// Therefore only mutateAsync (a stable reference) is extracted, and the cancellation signal is managed
// with an unmount-only ref.
export function useFaviconBackfill(bookmarks: Bookmark[] | undefined) {
  const inFlight = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { mutateAsync: reportAttempts } = trpc.bookmark.reportFaviconAttempts.useMutation();
  const unmountedRef = useRef(false);

  useEffect(
    () => () => {
      unmountedRef.current = true;
    },
    [],
  );

  useEffect(() => {
    if (!bookmarks || bookmarks.length === 0) return;

    const now = Date.now();
    const queue = bookmarks.filter((b) => needsBackfill(b, now) && !inFlight.current.has(b.id));
    if (queue.length === 0) return;

    queue.forEach((b) => inFlight.current.add(b.id));

    (async () => {
      let pending: { id: string; faviconUrl: string | null }[] = [];

      const flush = async () => {
        if (pending.length === 0 || unmountedRef.current) return;
        const batch = pending;
        pending = [];

        // Optimistically update the local listAll cache before reporting to the server.
        const attemptedAt = new Date();
        const updates = new Map(batch.map((a) => [a.id, a.faviconUrl] as const));
        queryClient.setQueriesData<Bookmark[]>({ queryKey: getQueryKey(trpc.bookmark.listAll) }, (old) =>
          old?.map((b) => {
            if (!updates.has(b.id)) return b;
            return {
              ...b,
              faviconUrl: updates.get(b.id) ?? null,
              faviconAttemptedAt: attemptedAt,
              faviconAttemptCount: b.faviconAttemptCount + 1,
            };
          }),
        );

        try {
          await reportAttempts({ attempts: batch });
        } catch {
          // If the server update fails, it is corrected automatically on the next listAll refresh.
          // Remove the entries that failed to send from inFlight so a later effect can retry them.
          batch.forEach((a) => inFlight.current.delete(a.id));
        }
      };

      const worker = async (iter: Iterator<Bookmark>) => {
        while (!unmountedRef.current) {
          const next = iter.next();
          if (next.done) return;
          const b = next.value;
          const faviconUrl = await resolveFaviconUrl(b.url).catch(() => null);
          if (unmountedRef.current) return;
          pending.push({ id: b.id, faviconUrl });
          if (pending.length >= BATCH_REPORT_SIZE) {
            await flush();
          }
        }
      };

      const iter = queue[Symbol.iterator]();
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(iter));
      await Promise.all(workers);
      await flush();
    })();
  }, [bookmarks, queryClient, reportAttempts]);
}
