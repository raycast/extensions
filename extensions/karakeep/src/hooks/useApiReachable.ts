import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Preferences } from "../types";
import { isApiReachable } from "../utils/connection";
import { ensureReachable } from "../utils/submitGuard";
import { useCanRecoverLocally } from "./useCanRecoverLocally";

export type ReachabilityState = "checking" | "reachable" | "unreachable";

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
  const { apiUrl } = getPreferenceValues<Preferences>();
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
    const reachable = Boolean(apiUrl) && (await isApiReachable(apiUrl));
    if (mounted.current) setState(reachable ? "reachable" : "unreachable");
    return reachable;
  }, [apiUrl]);

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
    reachable: state === "reachable",
    /** Offer the Start action only when starting something could actually help. */
    canStart,
    isRecovering,
    recheck: check,
    start,
  };
}
