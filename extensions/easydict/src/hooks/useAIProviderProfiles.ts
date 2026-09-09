/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { usePromise } from "@raycast/utils";
import { useCallback } from "react";

import { type AIProviderConfigurationLoadResult, loadAIProviderConfiguration } from "@/ai-providers/configuration";
import { saveAIProviderState } from "@/ai-providers/repository";
import type { StoredAIProviderState } from "@/ai-providers/types";

export function useAIProviderProfiles() {
  const { data, isLoading, mutate, revalidate } = usePromise(loadAIProviderConfiguration, []);
  const state: { kind: "loading" } | AIProviderConfigurationLoadResult = isLoading
    ? { kind: "loading" }
    : (data ?? { kind: "error", error: new Error("Failed to load AI provider profiles.") });

  const update = useCallback(
    async (nextState: StoredAIProviderState) => {
      const nextResult: AIProviderConfigurationLoadResult = { kind: "ready", state: nextState };
      await saveAIProviderState(nextState);
      await mutate(Promise.resolve(nextResult), {
        optimisticUpdate: () => nextResult,
        shouldRevalidateAfter: false,
      });
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
