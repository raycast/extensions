import { popToRoot } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getActiveSession, type ActiveSession } from "./session";

/** Ogni quanto la vista controlla la scadenza dell'auto-lock (robusto anche dopo lo sleep del Mac). */
const EXPIRY_CHECK_MS = 1_000;

/**
 * Carica la sessione dalla cache (se non scaduta); altrimenti `session` resta null.
 *
 * Finché la vista resta aperta controlla la scadenza dell'auto-lock: allo scadere
 * blocca la sessione (cache + chiavi in memoria + appunti), torna alla radice del
 * comando e mostra di nuovo la richiesta della master password.
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
