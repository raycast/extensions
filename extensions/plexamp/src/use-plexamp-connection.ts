import { useCallback, useEffect, useState } from "react";

import { getPlexampClientInfo } from "./plex";

interface PlexampConnectionState {
  isLoading: boolean;
  isReachable: boolean;
  error?: string;
}

export function usePlexampConnection() {
  const [state, setState] = useState<PlexampConnectionState>({
    isLoading: true,
    isReachable: false,
  });

  const reload = useCallback(async () => {
    setState((current) => ({
      ...current,
      isLoading: true,
      error: undefined,
    }));

    try {
      await getPlexampClientInfo();
      setState({ isLoading: false, isReachable: true });
    } catch (error) {
      setState({
        isLoading: false,
        isReachable: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    ...state,
    reload,
  };
}
