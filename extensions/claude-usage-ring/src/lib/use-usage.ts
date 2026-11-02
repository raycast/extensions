import { getPreferenceValues, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { existsSync } from "node:fs";
import { EMPTY_STATE, type UsageState } from "../types";
import { BRIDGE_SCRIPT } from "./bridge";
import { readClaudeCodeUsage } from "./claude-code-source";
import { MENU_BAR_COMMAND } from "./constants";

export async function loadUsageState(): Promise<UsageState> {
  return { connected: existsSync(BRIDGE_SCRIPT), usage: await readClaudeCodeUsage() };
}

export async function syncMenuBar(): Promise<void> {
  await launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.Background }).catch(() => undefined);
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
  const { data, isLoading, revalidate } = useCachedPromise(loadUsageState, [], {
    onData: sync ? syncMenuBar : undefined,
  });
  return { state: data ?? EMPTY_STATE, prefs, isLoading, revalidate };
}
