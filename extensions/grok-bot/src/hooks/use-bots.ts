import { Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { listAgents } from "../lib/gateway";
import { readCachedBots, writeCachedBots } from "../lib/roster-cache";
import { applyRosterRefresh, isStaleRosterFailure, visibleRoster } from "../lib/roster-refresh";
import { Bot, GatewayError, gatewayErrorMessage } from "../lib/types";

export function useBots(): {
  bots: Bot[];
  error: GatewayError | null;
  isLoading: boolean;
  revalidate: () => void;
} {
  const [committed, setCommitted] = useState<Bot[]>(readCachedBots);
  const [draft, setDraft] = useState<Bot[] | null>(null);
  const [error, setError] = useState<GatewayError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestId, setRequestId] = useState(0);

  const revalidate = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    setIsLoading(true);
    setDraft(null);
    setError(null);

    void listAgents({
      signal: abort.signal,
      onUpdate: (next) => {
        if (!abort.signal.aborted) {
          setDraft(next);
        }
      },
    }).then((result) => {
      if (abort.signal.aborted) {
        return;
      }

      setIsLoading(false);
      setDraft(null);
      setCommitted((current) => applyRosterRefresh({ committed: current, result }).committed);
      setError(result.ok ? null : result.error);
      if (result.ok) {
        writeCachedBots(result.value);
      }
    });

    return () => {
      abort.abort();
    };
  }, [requestId]);

  useEffect(() => {
    const failure = { error, committedCount: committed.length };
    if (!isStaleRosterFailure(failure)) {
      return;
    }

    void showToast({
      style: Toast.Style.Failure,
      title: "Couldn't refresh bots",
      message: gatewayErrorMessage(failure.error),
      primaryAction: {
        title: "Retry",
        onAction: revalidate,
      },
    });
  }, [committed.length, error, revalidate]);

  const bots = visibleRoster({ committed, draft });
  return { bots, error, isLoading, revalidate };
}
