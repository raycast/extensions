import { useCallback } from "react";

import { getPlexampClientInfo } from "./plex";
import { useAsyncValue } from "./use-async-value";

export function usePlexampConnection() {
  const state = useAsyncValue(
    useCallback(async () => {
      await getPlexampClientInfo();
      return { isReachable: true };
    }, []),
    "plexamp-connection",
    { isReachable: false },
  );

  return {
    isLoading: state.isLoading,
    isReachable: state.value.isReachable,
    error: state.error,
    reload: state.reload,
  };
}
