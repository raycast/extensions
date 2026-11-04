import { activateBundle, bundleFor, focusTmuxPane, focusTty, openInTerminal, tmuxPaneAlive, ttyAlive } from "./terminal";
import { run } from "./exec";
import { JumpResult } from "./adapters/types";
import { Config, Session } from "./types";

export async function openUrl(url: string): Promise<boolean> {
  const r = await run("/usr/bin/open", [url]);
  return r.ok;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const r = await run("/usr/bin/pbcopy", [], text);
  return r.ok;
}

const cliNavigation = { activateBundle, bundleFor, focusTmuxPane, focusTty, openInTerminal, tmuxPaneAlive, ttyAlive };

/**
 * Jump back to a terminal session: focus the tmux pane or terminal tab that still runs it;
 * if it is gone, resume it in a new terminal window.
 */
export async function jumpToCli(session: Session, resumeCommand: string, config: Config, navigation = cliNavigation): Promise<JumpResult> {
  const loc = session.locator ?? {};
  const alive = await navigation.ttyAlive(loc.tty);
  if (loc.tmuxPane && (await navigation.tmuxPaneAlive(loc)) && (alive || !loc.tty)) {
    if (await navigation.focusTmuxPane(loc)) return { ok: true, method: "tmux" };
  }
  if (alive && loc.tty) {
    const bundle = navigation.bundleFor(loc);
    if (await navigation.focusTty(loc.tty, bundle)) return { ok: true, method: "tab" };
    // Older versions or unsupported terminals may only allow raising the application.
    if (bundle && (await navigation.activateBundle(bundle))) return { ok: true, method: "activate" };
  }
  const ok = await navigation.openInTerminal(resumeCommand, session.cwd, config.resumeTerminal);
  return { ok, method: "resume" };
}
