/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { myPreferences } from "@/consts";
import { getBuiltinProviderCandidates } from "@/core/query/providerOrder";
import { builtinProviderServices } from "@/providers/registry";
import { normalizeError } from "@/utils/errors";

import { migrateLegacyAIProviderState } from "./legacy";
import { getLegacyAIProviderConfiguration } from "./legacyConfiguration";
import { type AIProviderLoadResult, loadAIProviderState, saveAIProviderState } from "./repository";
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
