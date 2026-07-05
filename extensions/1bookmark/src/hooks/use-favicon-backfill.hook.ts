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
// 시도 횟수가 이 이상이면 영구 실패로 보고 재시도하지 않음.
const MAX_ATTEMPT_COUNT = 20;

function needsBackfill(b: Bookmark, now: number): boolean {
  if (b.faviconUrl) return false;
  if (b.faviconAttemptCount >= MAX_ATTEMPT_COUNT) return false;
  if (!b.faviconAttemptedAt) return true;
  return now - new Date(b.faviconAttemptedAt).getTime() > RETRY_AFTER_MS;
}

// 북마크 목록을 보고 favicon이 비어있는 항목을 클라이언트에서 resolve해 서버에 보고한다.
// 한 번 처리한 id는 프로세스 수명 동안 재시도하지 않는다 (세션 간 중복 요청 방지).
// 서버 보고와 동시에 listAll 캐시를 낙관적으로 업데이트해 UI에 즉시 반영.
//
// 주의: useMutation 반환 객체는 상태(isPending 등)가 바뀌면 새 참조가 되므로
// deps에 넣으면 effect cleanup이 돌면서 진행 중인 백필을 죽인다. 그래서
// mutateAsync(안정 참조)만 뽑아 쓰고, 취소 신호는 unmount 전용 ref로 관리한다.
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

        // 서버로 보고하기 전에 로컬 listAll 캐시를 낙관적 업데이트.
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
          // 서버 반영 실패 시 다음 listAll 새로고침 때 자동 교정됨.
          // 전송 실패한 항목은 inFlight에서 빼서 이후 effect에서 재시도할 수 있게 한다.
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
