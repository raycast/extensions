import { closeMainWindow, showHUD } from "@raycast/api";
import { cleanupOptions, loadEngine, readSelection, remember, replaceSelection, undoAutoSelect } from "./lib/engine";
import { cleanUpPersian } from "./lib/persian";
import { openSetupOnFirstRun } from "./lib/onboarding";

export default async function Command() {
  if (await openSetupOnFirstRun()) return;
  await closeMainWindow();
  const engine = await loadEngine();
  const { prefs } = engine;

  const selection = await readSelection(prefs.autoSelect);
  if (!selection) {
    await showHUD("Select some Persian text first");
    return;
  }

  const cleaned = cleanUpPersian(selection.text, cleanupOptions(prefs), engine.dicts);
  if (cleaned === selection.text) {
    await undoAutoSelect(selection.auto);
    await showHUD("Already clean");
    return;
  }

  await replaceSelection(cleaned, prefs.restoreClipboard);
  await remember(engine, "cleanup", selection.text, cleaned, { undoable: true });
  await showHUD(prefs.showPreview ? `Cleaned up: ${cleaned.trim().slice(0, 60)}` : "Cleaned up");
}
