import { useCallback, useEffect, useRef, useState } from "react";
import { hasStoredTeakSession } from "./oauth";
import { grandfatheredApiKey } from "./preferences";

export interface TeakAuthState {
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => void;
}

const checkCredentials = async () => {
  if (grandfatheredApiKey()) {
    return { error: null, isAuthenticated: true };
  }
  try {
    return { error: null, isAuthenticated: await hasStoredTeakSession() };
  } catch {
    return {
      error: "Unable to reach Teak. Check your connection and retry.",
      isAuthenticated: false,
    };
  }
};

export function useTeakAuth(): TeakAuthState {
  const [state, setState] = useState<Omit<TeakAuthState, "refresh">>({
    error: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const latestCheck = useRef(0);

  const refresh = useCallback(() => {
    latestCheck.current += 1;
    const check = latestCheck.current;
    setState((current) => ({ ...current, error: null, isLoading: true }));
    void checkCredentials().then((result) => {
      if (check === latestCheck.current) {
        setState({ ...result, isLoading: false });
      }
    });
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      latestCheck.current += 1;
    };
  }, [refresh]);

  return { ...state, refresh };
}
