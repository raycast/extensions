import { popToRoot } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getActiveSession, type ActiveSession } from "./session";

/** How often an open view checks the auto-lock expiry (robust after the Mac wakes from sleep). */
const EXPIRY_CHECK_MS = 1_000;

/**
 * Loads the stored session (if not expired); otherwise `session` stays null.
 *
 * While the view is open it watches the auto-lock expiry: when it expires it locks
 * the session (stored snapshot + in-memory keys + clipboard), pops to the command
 * root and asks for the master password again.
 */
export function useSession() {
  const [session, setSessionState] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((s: ActiveSession | null) => setSessionState(s), []);

  useEffect(() => {
    let cancelled = false;
    getActiveSession()
      .then((s) => {
        if (!cancelled) setSessionState(s);
      })
      .catch(() => {
        if (!cancelled) setSessionState(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let done = false;
    const check = () => {
      if (done || Date.now() < session.expiresAt) return;
      done = true;
      clearInterval(timer);
      void session.lock().finally(() => {
        void popToRoot({ clearSearchBar: true });
        setSessionState(null);
      });
    };
    const timer = setInterval(check, EXPIRY_CHECK_MS);
    check();
    return () => {
      done = true;
      clearInterval(timer);
    };
  }, [session]);

  return { session, setSession, loading };
}
