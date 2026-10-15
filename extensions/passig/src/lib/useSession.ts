import { useEffect, useState } from "react";
import { getActiveSession, type ActiveSession } from "./session";

/** Carica la sessione dalla cache (se non scaduta); altrimenti `session` resta null. */
export function useSession() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getActiveSession()
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, setSession, loading };
}
