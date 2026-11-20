import { useEffect, useRef, useState } from "react";
import { startFeedRequests } from "./feed-requests";

interface Snapshot<T> {
  data: T;
  complete: boolean;
}

export function useFeed<T>(
  url: string,
  interval: number,
  read: (response: Response) => Promise<T>,
  merge?: (next: T, previous: T | undefined) => Snapshot<T>,
) {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>();
  const requests = useRef<ReturnType<typeof startFeedRequests>>();

  useEffect(() => {
    let previous: T | undefined;
    const session = startFeedRequests(interval, async (signal) => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = await read(response);
      if (signal.aborted) return false;

      const result = merge ? merge(next, previous) : { data: next, complete: true };
      previous = result.data;
      setSnapshot(result);
      return result.complete;
    });
    requests.current = session;
    return () => {
      requests.current = undefined;
      session.stop();
    };
  }, [interval, merge, read, url]);

  return { data: snapshot?.data, loading: !snapshot?.complete, refresh: () => requests.current?.refresh() };
}
