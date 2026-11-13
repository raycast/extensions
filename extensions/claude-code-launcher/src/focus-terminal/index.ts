import { activateProcess, openAppBundle } from "./activate-app";
import { appNameOf, bundlePathOf, getAncestors, getTtyPath, isTerminalProcess } from "./process";
import { getFocusAdapter } from "./registry";
import { FocusResult } from "./types";

export type { FocusAdapter, FocusResult } from "./types";

/**
 * Focus the terminal window that hosts the Claude process with the given pid,
 * instead of opening a new one. Throws when the hosting terminal cannot be
 * located (e.g. the session runs inside tmux, over ssh, or in an editor pane
 * that System Events cannot target).
 */
export async function focusSessionTerminal(pid: number): Promise<FocusResult> {
  const [ttyPath, ancestors] = await Promise.all([getTtyPath(pid), getAncestors(pid)]);

  const terminalAncestor = ancestors.find(isTerminalProcess);

  if (ttyPath && terminalAncestor) {
    // Window/tab-level targeting for scriptable terminals; adapters are matched
    // against the app found in the ancestry, since `tell application` would
    // launch an app that is not running.
    const adapter = getFocusAdapter(terminalAncestor.command);
    if (adapter && (await adapter.focusSession(ttyPath))) {
      return { kind: "window" };
    }
  }

  // Fall back to activating the hosting app process. Prefer the recognized
  // terminal ancestor; otherwise try the top-level ancestor spawned by launchd.
  const candidate = terminalAncestor ?? ancestors.find((p) => p.ppid === 1);
  if (!candidate) {
    throw new Error("Could not locate the terminal hosting this session");
  }
  try {
    await activateProcess(candidate.pid);
  } catch {
    const bundlePath = bundlePathOf(candidate.command);
    if (!bundlePath) {
      throw new Error("Could not locate the terminal hosting this session");
    }
    await openAppBundle(bundlePath);
  }
  return { kind: "app", appName: appNameOf(candidate.command) };
}
