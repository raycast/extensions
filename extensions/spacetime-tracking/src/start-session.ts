import { showHUD } from "@raycast/api";
import { getActiveSession, startSession } from "./lib/storage";
import { tick } from "./lib/tracker";
import { showWarningAlert } from "./lib/dialog";
import { refreshMenuBar } from "./lib/menubar";

export default async function Command() {
  // Don't clobber a running session — Raycast can't grey out the command, so we
  // refuse here instead. Stop the current one first to start a new session.
  const active = await getActiveSession();
  if (active) {
    showWarningAlert(`A session is already recording: “${active.name}”.\n\nStop it before starting a new one.`);
    return;
  }
  const session = await startSession();
  await tick();
  await refreshMenuBar();
  await showHUD(`Started “${session.name}”`);
}
