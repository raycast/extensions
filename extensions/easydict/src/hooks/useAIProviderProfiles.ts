/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { usePromise } from "@raycast/utils";
import { useCallback } from "react";

import { type AIProviderLoadResult, loadAIProviderState, saveAIProviderState } from "@/ai-providers/repository";
import type { StoredAIProviderStateV1 } from "@/ai-providers/types";

export function useAIProviderProfiles() {
  const { data, isLoading, mutate, revalidate } = usePromise(loadAIProviderState, []);
  const state: { kind: "loading" } | AIProviderLoadResult = isLoading
    ? { kind: "loading" }
    : (data ?? { kind: "error", error: new Error("Failed to load AI provider profiles.") });

  const update = useCallback(
    async (nextState: StoredAIProviderStateV1) => {
      const nextResult: AIProviderLoadResult = { kind: "ready", state: nextState };
      await mutate(
        saveAIProviderState(nextState).then(() => nextResult),
        {
          optimisticUpdate: () => nextResult,
        },
      );
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
