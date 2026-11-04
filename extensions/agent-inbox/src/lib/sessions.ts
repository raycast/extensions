import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { allAdapters, getAdapter } from "../core/adapters";
import { Store } from "../core/db";
import { enrichClaudeSessions } from "../core/claude-desktop";
import { TitleSynchronizer } from "../core/titles";
import { Config, Session } from "../core/types";
import { recoverIdleSessionStates } from "../core/transcript-state";

export const store = new Store();
const titleSync = new TitleSynchronizer(store, allAdapters);
export const refreshSessionTitles = (sessions: Session[]) => titleSync.refresh(sessions);

export async function activeSessions(): Promise<Session[]> {
  return recoverIdleSessionStates(await refreshSessionTitles(enrichClaudeSessions(await store.active())));
}

export async function allSessions(limit = 500): Promise<Session[]> {
  return recoverIdleSessionStates(enrichClaudeSessions(await store.all(limit)));
}

/** Jump back to the session and close Raycast. Shows a HUD when a fallback was used. */
export async function jumpBack(session: Session, config: Config): Promise<void> {
  const adapter = getAdapter(session.agent);
  if (!adapter) {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't jump back", message: session.agent });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Jump to Session" });
  try {
    const r = await adapter.jump(session, config);
    if (!r.ok) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't jump back";
      return;
    }
    toast.hide();
    if (r.method === "copied") await showHUD("Session ID copied — paste it in the app");
    else if (r.method === "resume") await showHUD("Resumed in a new terminal");
    else await closeMainWindow({ clearRootSearch: true });
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't jump back";
    toast.message = String((e as Error).message ?? e);
  }
}
