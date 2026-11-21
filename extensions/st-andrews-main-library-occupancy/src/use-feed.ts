import { usePromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { loadFeedSnapshot, startFeedRequests, type RefreshResult, type Snapshot } from "./feed-requests";

export function useFeed<T>(
  url: string,
  interval: number,
  read: (response: Response) => Promise<T>,
  merge?: (next: T, previous: T | undefined) => Snapshot<T>,
) {
  const previous = useRef<Snapshot<T>>();
  const signal = useRef<AbortSignal>();
  const requests = useRef<ReturnType<typeof startFeedRequests>>();
  const { data, revalidate } = usePromise(
    async () => {
      const requestSignal = signal.current;
      const result = await loadFeedSnapshot(url, requestSignal, read, previous.current, merge);
      if (requestSignal?.aborted) return { snapshot: previous.current, error: new Error("Request cancelled") };
      // Only valid responses advance the merge baseline. Failed requests keep the same rendered snapshot.
      if (!result.error) previous.current = result.snapshot;
      return result;
    },
    [],
    { execute: false },
  );

  useEffect(() => {
    previous.current = undefined;
    // usePromise owns the rendered snapshot. The scheduler supplies per-feed backoff, timeouts, and coalescing.
    const session = startFeedRequests(interval, async (requestSignal) => {
      signal.current = requestSignal;
      const result = await revalidate();
      if (result.error) throw result.error;
      return result.snapshot?.complete ?? false;
    });
    requests.current = session;
    return () => {
      requests.current = undefined;
      session.stop();
    };
  }, [interval, merge, read, revalidate, url]);

  return {
    data: data?.snapshot?.data,
    loading: !data?.snapshot?.complete,
    refresh: (): Promise<RefreshResult> => requests.current?.refresh() ?? Promise.resolve({ status: "cancelled" }),
  };
}
