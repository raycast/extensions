import { closeMainWindow, getFrontmostApplication, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { captureAfterRaycast, sessionForForeground } from "../core/foreground";
import { FocusAccessError } from "../core/focused-window";
import { scanHistory } from "../core/history";
import { mergeSessions } from "../core/merge";
import { isClaudeCloudOnly } from "../core/claude-desktop";
import { extensionConfig } from "./env";
import { allSessions, store } from "./sessions";
import { readCodexDesktopSessions } from "./codex-desktop";

/**
 * Shared by the root command and All Sessions action. Capture the original window
 * after Raycast closes, before reading history or showing a HUD.
 */
export async function subscribeCurrent() {
  try {
    extensionConfig();
    const focused = await captureAfterRaycast({
      close: closeMainWindow,
      getBundleId: async () => (await getFrontmostApplication()).bundleId,
    });
    const sessions = mergeSessions(await allSessions(1000), scanHistory({ limit: 400 }));
    const session = await sessionForForeground(focused, sessions, { readCodexDesktopSessions });
    if (!session) {
      await showHUD("Couldn't identify the current session; select it in All Sessions");
      return;
    }
    const title = session.title || session.sessionId;
    await store.subscribeEntry(session, { focused: true });
    await showHUD(
      isClaudeCloudOnly(session)
        ? "Subscribed: " + title + " (cloud status unavailable)"
        : session.subscribed
          ? "Already subscribed · " + title
          : "Subscribed · " + title,
    );
  } catch (error) {
    if (error instanceof FocusAccessError) {
      await showHUD("Can't read the window; check Raycast's Accessibility and Automation permissions");
    } else {
      await showFailureToast(error, { title: "Couldn't subscribe to the current conversation" });
    }
  }
}
