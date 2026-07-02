import { useCallback, useEffect, useState } from "react";
import { AuthState, getAuthState } from "../functions/lastfm";

export function useAuthState() {
  const [authState, setAuthState] = useState<AuthState | null>(null);

  const refresh = useCallback(async () => {
    const state = await getAuthState();
    setAuthState(state);
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  return { authState, setAuthState, refreshAuthState: refresh };
}
