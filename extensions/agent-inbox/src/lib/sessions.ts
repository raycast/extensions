import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { allAdapters, getAdapter } from "../core/adapters";
import { Store } from "../core/db";
import { enrichClaudeSessions } from "../core/claude-desktop";
import { TitleSynchronizer } from "../core/titles";
import { Translator } from "../core/messages";
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
export async function jumpBack(session: Session, config: Config, t: Translator): Promise<void> {
  const adapter = getAdapter(session.agent);
  if (!adapter) {
    await showToast({ style: Toast.Style.Failure, title: t("toast.jumpFailed"), message: session.agent });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: t("action.jump") });
  try {
    const r = await adapter.jump(session, config);
    if (!r.ok) {
      toast.style = Toast.Style.Failure;
      toast.title = t("toast.jumpFailed");
      return;
    }
    toast.hide();
    if (r.method === "copied") await showHUD(t("toast.copiedId"));
    else if (r.method === "resume") await showHUD(t("toast.resumed"));
    else await closeMainWindow({ clearRootSearch: true });
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = t("toast.jumpFailed");
    toast.message = String((e as Error).message ?? e);
  }
}
