/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { usePromise } from "@raycast/utils";
import { useCallback } from "react";

import { type AIProviderConfigurationLoadResult, loadAIProviderConfiguration } from "./configuration";
import { updateAIProviderState } from "./repository";
import type { StoredAIProviderState } from "./types";

export function useAIProviderProfiles() {
  const { data, isLoading, mutate, revalidate } = usePromise(loadAIProviderConfiguration, []);
  const state: { kind: "loading" } | AIProviderConfigurationLoadResult =
    data ??
    (isLoading ? { kind: "loading" } : { kind: "error", error: new Error("Failed to load AI provider profiles.") });

  const update = useCallback(
    async (createNextState: (state: StoredAIProviderState) => StoredAIProviderState) => {
      const nextState = await updateAIProviderState(createNextState);
      const nextResult: AIProviderConfigurationLoadResult = { kind: "ready", state: nextState };
      await mutate(Promise.resolve(nextResult), {
        optimisticUpdate: () => nextResult,
        shouldRevalidateAfter: false,
      });
      return nextState;
    },
    [mutate],
  );

  return {
    state,
    isLoading,
    profiles: state.kind === "ready" || state.kind === "missing" ? state.state.profiles : undefined,
    storedState: state.kind === "ready" || state.kind === "missing" ? state.state : undefined,
    update,
    revalidate,
  } as const;
}
