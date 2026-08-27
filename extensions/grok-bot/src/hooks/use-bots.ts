import { useCallback, useEffect, useState } from "react";
import { listAgents } from "../lib/gateway";
import { readCachedBots, writeCachedBots } from "../lib/roster-cache";
import { Bot, GatewayError } from "../lib/types";

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
    const hadCommittedRoster = committed.length > 0;
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
      if (result.ok) {
        setCommitted(result.value);
        setError(null);
        writeCachedBots(result.value);
        return;
      }

      if (!hadCommittedRoster) {
        setError(result.error);
      }
    });

    return () => {
      abort.abort();
    };
  }, [requestId]);

  const bots = committed.length > 0 ? committed : (draft ?? []);
  return { bots, error, isLoading, revalidate };
}
