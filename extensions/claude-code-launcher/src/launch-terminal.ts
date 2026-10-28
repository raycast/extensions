import { closeMainWindow } from "@raycast/api";
import { access, constants } from "fs/promises";
import { getTerminalAdapter } from "./terminal-adapters";
import { expandTilde } from "./utils";

export interface TerminalLaunchPreferences {
  terminalApp: string;
  ghosttyOpenBehavior?: string;
}

/**
 * Opens the user's preferred terminal in the given directory running
 * `claude` with the given arguments (plain `claude` when omitted).
 * Throws on inaccessible directories or unsupported terminals; callers
 * are responsible for toasts.
 */
export async function launchClaudeInTerminal(
  directory: string,
  preferences: TerminalLaunchPreferences,
  claudeArgs?: string[],
): Promise<void> {
  const expandedPath = expandTilde(directory);

  try {
    await access(expandedPath, constants.R_OK);
  } catch {
    throw new Error(`Cannot access directory: ${expandedPath}. It may have been moved or deleted.`);
  }

  const adapter = getTerminalAdapter(preferences.terminalApp);

  if (!adapter) {
    throw new Error(`Unsupported terminal: ${preferences.terminalApp}`);
  }

  const options = {
    ghosttyOpenBehavior: preferences.ghosttyOpenBehavior as "window" | "tab" | undefined,
    claudeArgs,
  };

  if (preferences.terminalApp === "Ghostty" && options.ghosttyOpenBehavior === "tab") {
    await closeMainWindow();
  }

  await adapter.open(expandedPath, options);
}
