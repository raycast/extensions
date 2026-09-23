import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { probeApi } from "../utils/connection";
import { ensureReachable } from "../utils/submitGuard";
import { useCanRecoverLocally } from "./useCanRecoverLocally";

export type ReachabilityState = "checking" | "reachable" | "unauthorized" | "unreachable";

/**
 * Whether the API is answering, resolved once before dependent fetches run.
 *
 * Form commands load lists and tags the moment they mount. Against a dead
 * server those rejections surface as Raycast's own "Failed to fetch latest
 * data / fetch failed" toast — raised by useCachedPromise before any of our
 * own error handling gets a look in, and showing the user the exact opaque
 * string we were trying to eliminate. Gating those fetches on this hook keeps
 * them from firing at all until we know there's something to talk to.
 */
export function useApiReachable() {
  // Raycast snapshots preferences per command run, so apiKey cannot change
  // mid-run today — it is in the deps below because memoizing on apiUrl alone
  // would be wrong. Recovery is relaunching; see AuthErrorView's popToRoot.
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();
  const [state, setState] = useState<ReachabilityState>("checking");
  const [isRecovering, setIsRecovering] = useState(false);
  // Only probed once the server is known down — a healthy hosted user never
  // pays for a docker call.
  const canStart = useCanRecoverLocally(state === "unreachable");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    // probeApi, not isApiReachable: a rejected key must not report "reachable".
    // Every consumer gates its dependent fetches on `=== "reachable"`, so this
    // one classification is what stops a bad key cascading into a doomed
    // /api/v1/lists request (and its toast) behind every view that has one.
    // Blank apiUrl is "unauthorized", NOT "unreachable". Nothing is down — the
    // extension was never configured — and "unreachable" sends the user to
    // Docker recovery for a problem only Settings can fix. Kept identical to
    // what the fetch layer and ensureReachable now report, so the same broken
    // config cannot be diagnosed three different ways in three places.
    const result = apiUrl ? await probeApi(apiUrl) : "unauthorized";
    if (mounted.current) setState(result === "ok" ? "reachable" : result);
    return result === "ok";
  }, [apiUrl, apiKey]);

  useEffect(() => {
    check();
  }, [check]);

  /** Start a stopped local container, then re-check. Drives the forms' Start action. */
  const start = useCallback(async () => {
    setIsRecovering(true);
    try {
      if ((await ensureReachable()) === "ok") await check();
    } finally {
      // Every path — leaving this true sticks the action on "Starting…".
      if (mounted.current) setIsRecovering(false);
    }
  }, [check]);

  return {
    state,
    offline: state === "unreachable",
    // Distinct from `offline`: the server is up and there is nothing to start,
    // so the form must offer Settings rather than a Start action that lies.
    unauthorized: state === "unauthorized",
    reachable: state === "reachable",
    /** Offer the Start action only when starting something could actually help. */
    canStart,
    isRecovering,
    recheck: check,
    start,
  };
}
