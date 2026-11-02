import { getPreferenceValues, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { EMPTY_STATE, type UsageState } from "../types";
import { isBridgeConnected } from "./bridge";
import { readClaudeCodeUsage } from "./claude-code-source";
import { redrawRing } from "./ring-visibility";

export async function loadUsageState(): Promise<UsageState> {
  const [connected, usage] = await Promise.all([isBridgeConnected(), readClaudeCodeUsage()]);
  return { connected, usage };
}

export async function syncMenuBar(): Promise<void> {
  await redrawRing().catch(() => undefined);
}

export async function openCommand(name: string): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch {
    await showHUD("Couldn't open the command. Make sure it is enabled in Raycast Settings.");
  }
}

export function useUsage({ sync = false }: { sync?: boolean } = {}) {
  const prefs = getPreferenceValues<Preferences>();
  const { data, error, isLoading, revalidate } = useCachedPromise(loadUsageState, [], {
    onData: sync ? syncMenuBar : undefined,
    onError: () => undefined,
  });
  return { state: data ?? EMPTY_STATE, error, prefs, isLoading, revalidate };
}
