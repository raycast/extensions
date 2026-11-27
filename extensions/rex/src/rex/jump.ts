import { closeMainWindow, getApplications, getPreferenceValues, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { REX_BUNDLE_ID, RexError, runRex, type RexInstall } from "./cli";
import type { RexHost } from "./types";

export interface JumpTarget {
  /** Server the session lives on. The local server when omitted. */
  host?: RexHost;
  sessionId: string;
  windowId: string;
  /** Block to focus inside the window. Defaults to the window's own focused block. */
  blockId?: string;
}

export interface JumpResult {
  /** The app accepted the switch request. */
  switchedApp: boolean;
  /** The app refused because Remote Control is off, so only server-side focus happened. */
  remoteControlOff: boolean;
}

/**
 * Focus a window (and optionally a block) on the server, then ask the Rex app to show it.
 *
 * Server-side focus works on its own and activates the tab inside its session, on whichever host
 * the session lives. Switching which session the app displays needs the app's `session.select`
 * action on the local server, which the app only accepts when Remote Control is turned on.
 */
export async function jumpTo(install: RexInstall, target: JumpTarget): Promise<JumpResult> {
  const where = { host: target.host };
  const focusPane = () =>
    target.blockId
      ? runRex(install, ["focus", "-s", target.sessionId, target.blockId], where)
      : runRex(install, ["window", "focus", "-s", target.sessionId, target.windowId], where);

  // Order matters: when the Rex app is activated it re-applies the pane it remembers, so the caller
  // activates the app before this runs; here the app selects the session and tab, then the server
  // focuses the pane, which the app follows.
  let result: JumpResult = { switchedApp: true, remoteControlOff: false };
  try {
    await runRex(install, ["do", "session.select", `session_id=${target.sessionId}`, `window_id=${target.windowId}`]);
  } catch (error) {
    if (!(error instanceof RexError && error.remoteControlOff)) throw error;
    result = { switchedApp: false, remoteControlOff: true };
  }
  await focusPane();
  return result;
}

/** Bring the Rex app to the front. */
export async function activateRex(install: RexInstall): Promise<void> {
  if (install.app) {
    await open(install.app);
    return;
  }
  const app = (await getApplications()).find((candidate) => candidate.bundleId === REX_BUNDLE_ID);
  if (app) await open(app.path);
}

/** Jump and report the outcome the way a Raycast action should: close the window, show a HUD, or toast a failure. */
export async function performJump(install: RexInstall, target: JumpTarget, label: string): Promise<void> {
  const { activateApp } = getPreferenceValues<Preferences>();
  try {
    await closeMainWindow();
    if (activateApp) await activateRex(install);
    const result = await jumpTo(install, target);
    if (result.remoteControlOff) {
      await showHUD(`Focused ${label} · turn on Remote Control in Rex to switch sessions`);
    } else {
      await showHUD(`Rex · ${label}`);
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Jump in Rex" });
  }
}
