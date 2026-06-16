import { Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useRef } from "react";
import { connectPostHogAccount } from "./posthog-auth";

/**
 * Returns a memoized callback that runs the OAuth connect flow and surfaces its
 * progress/result as toasts, revalidating the caller's data on success.
 */
export function useConnectAccount(revalidate: () => void) {
  return useCallback(async () => {
    await showToast({ style: Toast.Style.Animated, title: "Connecting PostHog" });

    try {
      const account = await connectPostHogAccount();
      await showToast({
        style: Toast.Style.Success,
        title: "Connected PostHog account",
        message: account.email ?? account.region.toUpperCase(),
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not connect PostHog account",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [revalidate]);
}

/**
 * Triggers `connect` exactly once, after the first load settles, when there are
 * no accounts yet — so the connect flow opens automatically on a fresh install.
 */
export function useAutoConnectOnEmpty(isReady: boolean, isEmpty: boolean, connect: () => void) {
  const handledInitialLoad = useRef(false);

  useEffect(() => {
    if (!isReady || handledInitialLoad.current) {
      return;
    }

    handledInitialLoad.current = true;

    if (isEmpty) {
      void connect();
    }
  }, [isReady, isEmpty, connect]);
}
