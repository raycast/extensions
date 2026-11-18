import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { watchLiveThreads, type LiveThread } from "./amp";

/**
 * Live list of active threads from `amp top`. Starts from the last list seen so views don't
 * jump while the stream connects; when the stream ends it is empty until it reconnects.
 */
export function useLiveThreads(): LiveThread[] {
  const [threads, setThreads] = useCachedState<LiveThread[]>("live-threads", []);
  useEffect(() => {
    let stop = () => undefined as void;
    let retry: NodeJS.Timeout | undefined;
    const connect = () => {
      let first = true;
      const onThreads = (next: LiveThread[]) => {
        // Skip the empty placeholder `amp top` prints before the server answers.
        if (first && !next.length) return void (first = false);
        first = false;
        setThreads(next);
      };
      stop = watchLiveThreads(onThreads, () => {
        // The stream ended, so its working states are stale: drop them and reconnect.
        setThreads([]);
        retry = setTimeout(connect, 5_000);
      });
    };
    connect();
    return () => {
      clearTimeout(retry);
      stop();
    };
  }, []);
  return threads;
}
