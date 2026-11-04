import { closeMainWindow, getFrontmostApplication, showHUD } from "@raycast/api";
import { captureAfterRaycast, sessionForForeground } from "../core/foreground";
import { FocusAccessError } from "../core/focused-window";
import { scanHistory } from "../core/history";
import { mergeSessions } from "../core/merge";
import { isClaudeCloudOnly } from "../core/claude-desktop";
import { locale } from "./env";
import { allSessions, store } from "./sessions";

/**
 * Shared by the root command and All Sessions action. Capture the original window
 * after Raycast closes, before reading history or showing a HUD.
 */
export async function subscribeCurrent() {
  const { t } = locale();
  let session;
  try {
    const focused = await captureAfterRaycast({
      close: closeMainWindow,
      getBundleId: async () => (await getFrontmostApplication()).bundleId,
    });
    const sessions = mergeSessions(await allSessions(1000), scanHistory({ limit: 400 }));
    session = await sessionForForeground(focused, sessions);
  } catch (error) {
    await showHUD(t(error instanceof FocusAccessError ? "hud.focusPermission" : "hud.notFound"));
    return;
  }
  if (!session) {
    await showHUD(t("hud.notFound"));
    return;
  }
  const title = session.title || session.sessionId;
  try {
    await store.subscribeEntry(session, { focused: true });
    await showHUD(
      t(isClaudeCloudOnly(session) ? "hud.cloudSubscribed" : session.subscribed ? "hud.alreadySubscribed" : "hud.subscribed", { title }),
    );
  } catch (error) {
    await showHUD(`${t("toast.error")}: ${String((error as Error).message ?? error)}`);
  }
}
