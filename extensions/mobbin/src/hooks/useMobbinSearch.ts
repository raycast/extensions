import { useEffect, useMemo, useState } from "react";
import { createSearchClient } from "../lib/search-client";
import {
  MobbinSearchController,
  type SearchControllerState,
} from "../lib/search-controller";
import { clearSearchCache } from "../lib/search-cache";
import type { SearchOptions } from "../lib/types";

type Props = {
  preferences: Preferences;
  options: SearchOptions;
  refreshVersion: number;
  clientVersion: number;
  onCompleted: (
    options: SearchOptions,
    signal: AbortSignal,
  ) => Promise<void> | void;
};

export function useMobbinSearch({
  preferences,
  options,
  refreshVersion,
  clientVersion,
  onCompleted,
}: Props): SearchControllerState {
  const [state, setState] = useState<SearchControllerState>({
    results: [],
    isLoading: false,
  });
  const client = useMemo(
    () => createSearchClient(preferences),
    // Preferences are read once by the parent; these fields define the client identity.
    [preferences.authMode, preferences.apiKey, clientVersion],
  );
  const controller = useMemo(
    () =>
      new MobbinSearchController({
        client,
        authMode: preferences.authMode,
        onStateChange: setState,
        onCompleted,
      }),
    [client, onCompleted, preferences.authMode],
  );

  useEffect(() => {
    return () => {
      controller.dispose();
      void client.dispose();
    };
  }, [client, controller]);

  useEffect(() => {
    controller.update(options);
    return () => controller.dispose();
  }, [controller, options, refreshVersion]);

  return state;
}

export function invalidateMobbinSearchCache(): void {
  clearSearchCache();
}
