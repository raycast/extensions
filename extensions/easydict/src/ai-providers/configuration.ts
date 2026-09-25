/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { getBuiltinProviderCandidates } from "@/core/query/providerOrder";
import { builtinProviderServices } from "@/providers/registry";
import { normalizeError } from "@/utils/errors";

import { LEGACY_AI_PROVIDER_NAMES, migrateLegacyAIProviderState } from "./legacy";
import { getLegacyAIProviderConfiguration } from "./legacyConfiguration";
import {
  type AIProviderLoadResult,
  createEmptyAIProviderState,
  loadAIProviderState,
  saveAIProviderState,
} from "./repository";
import type { StoredAIProviderState } from "./types";

export type AIProviderConfigurationLoadResult =
  | Exclude<AIProviderLoadResult, { kind: "missing" | "ready" }>
  | { kind: "missing" | "ready"; state: StoredAIProviderState };

let pendingLoad: Promise<AIProviderConfigurationLoadResult> | undefined;

export function loadAIProviderConfiguration(): Promise<AIProviderConfigurationLoadResult> {
  pendingLoad ??= loadAndMigrate().finally(() => {
    pendingLoad = undefined;
  });
  return pendingLoad;
}

export function resetAIProviderConfiguration(): Promise<void> {
  return saveAIProviderState({
    ...createEmptyAIProviderState(),
    migratedLegacyProviders: [...LEGACY_AI_PROVIDER_NAMES],
  });
}

async function loadAndMigrate(): Promise<AIProviderConfigurationLoadResult> {
  const result = await loadAIProviderState();
  if (result.kind !== "missing" && result.kind !== "ready") return result;

  try {
    const state = migrateLegacyAIProviderState(
      result.state,
      getLegacyAIProviderConfiguration(),
      getBuiltinProviderCandidates(builtinProviderServices),
      myPreferences.servicesOrder ? myPreferences.servicesOrder.split(",") : [],
    );
    if (state === result.state) return { kind: result.kind, state };
    await saveAIProviderState(state);
    return { kind: "ready", state };
  } catch (error) {
    return { kind: "error", error: normalizeError(error) };
  }
}
