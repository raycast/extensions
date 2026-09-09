import { environment, getPreferenceValues, LaunchType, showHUD } from "@raycast/api";

import {
  useAihubmixUsage,
  useAmpUsage,
  useAntigravityUsage,
  useClaudeUsage,
  useCopilotAccounts,
  useCursorUsage,
  useDeepSeekUsage,
  useDroidUsage,
  useGeminiUsage,
  useGrokUsage,
  useMiniMaxUsage,
  useMinimaxCNUsage,
  useOpencodegoUsage,
  useOpenRouterUsage,
  useCodexAccounts,
  useClinePassAccounts,
  useKimiAccounts,
  useSyntheticAccounts,
  useZaiAccounts,
} from "./agents/provider-hooks.ts";

const providers = {
  showAihubmix: useAihubmixUsage,
  showAmp: useAmpUsage,
  showAntigravity: useAntigravityUsage,
  showClaude: useClaudeUsage,
  showCopilot: useCopilotAccounts,
  showCursor: useCursorUsage,
  showDeepSeek: useDeepSeekUsage,
  showDroid: useDroidUsage,
  showGemini: useGeminiUsage,
  showGrok: useGrokUsage,
  showMinimax: useMiniMaxUsage,
  showMinimaxCN: useMinimaxCNUsage,
  showOpencodeGo: useOpencodegoUsage,
  showOpenRouter: useOpenRouterUsage,
  showCodex: useCodexAccounts,
  showClinePass: useClinePassAccounts,
  showKimi: useKimiAccounts,
  showSynthetic: useSyntheticAccounts,
  showZai: useZaiAccounts,
};

export default async function Command(): Promise<void> {
  const prefs = getPreferenceValues<Partial<Record<keyof typeof providers, boolean>>>();
  const manual = environment.launchType === LaunchType.UserInitiated;
  const results = await Promise.allSettled(
    Object.entries(providers)
      .filter(([key]) => prefs[key as keyof typeof providers] !== false)
      .map(async ([key, provider]) => {
        const result = await provider.refresh(manual);
        if (result.error || (Array.isArray(result.usage) && result.usage.some((row) => row.error))) {
          console.error(`Usage refresh failed for ${key}`);
          return false;
        }
        return true;
      }),
  );
  for (const result of results) {
    if (result.status === "rejected") console.error("Usage refresh failed:", result.reason);
  }
  if (manual) {
    const failed = results.some((result) => result.status === "rejected" || !result.value);
    await showHUD(failed ? "Usage refreshed; some providers are unavailable" : "Agent usage refreshed");
  }
}
