import { Cache, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage, LeaderboardError, type ErrorKind } from "../lib/api";
import { LeaderboardService } from "../lib/cache";
import { formatRetrievedAt } from "../lib/format";
import type { LeaderboardSnapshot } from "../lib/models";

export interface LoadError {
  kind?: ErrorKind;
  message: string;
  retryAt?: number;
}

/** The error message, plus when a rate-limited refresh may be retried. */
export function describeLoadError(error: LoadError): string {
  return `${error.message}${error.retryAt ? ` Retry after ${formatRetrievedAt(error.retryAt)}.` : ""}`;
}

interface LeaderboardState {
  snapshot?: LeaderboardSnapshot;
  error?: LoadError;
  isLoading: boolean;
}

export function useLeaderboard(apiKey: string | undefined) {
  const key = apiKey?.trim() ?? "";
  const service = useMemo(
    () => (key ? new LeaderboardService(key, new Cache({ namespace: "leaderboard" })) : undefined),
    [key],
  );
  const [state, setState] = useState<LeaderboardState>(() => ({
    snapshot: service?.readSnapshot(),
    isLoading: !!service,
  }));
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (force = true) => {
      if (!service) {
        setState({ isLoading: false });
        return;
      }
      if (request.current) return;
      const controller = new AbortController();
      request.current = controller;
      setState((previous) => ({ ...previous, isLoading: true, error: undefined }));
      // Manual refreshes report progress; opening a command refreshes quietly.
      const toast = force ? await showToast({ style: Toast.Style.Animated, title: "Refreshing Rankings…" }) : undefined;
      try {
        const snapshot = await service.refresh(force, controller.signal);
        if (!controller.signal.aborted) {
          setState({ snapshot, isLoading: false });
          if (toast) {
            toast.style = Toast.Style.Success;
            toast.title = "Rankings Updated";
            toast.message = `${snapshot.models.length} models from Artificial Analysis`;
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const failure: LoadError = {
            kind: error instanceof LeaderboardError ? error.kind : undefined,
            message: errorMessage(error),
            retryAt: error instanceof LeaderboardError ? error.retryAt : undefined,
          };
          setState((previous) => ({ ...previous, error: failure, isLoading: false }));
          if (toast) {
            toast.style = Toast.Style.Failure;
            toast.title = "Couldn’t Refresh Rankings";
            toast.message = describeLoadError(failure);
          }
        }
      } finally {
        if (request.current === controller) request.current = null;
        if (controller.signal.aborted) await toast?.hide();
      }
    },
    [service],
  );

  useEffect(() => {
    setState({ snapshot: service?.readSnapshot(), isLoading: !!service });
    if (service) void refresh(false);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [service, refresh]);

  return { ...state, needsApiKey: !key, refresh };
}
