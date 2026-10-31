import { closeMainWindow, showHUD } from "@raycast/api";
import {
  describeFix,
  loadEngine,
  readSelection,
  remember,
  replaceSelection,
  runFix,
  switchTo,
  undoAutoSelect,
} from "./lib/engine";
import { openSetupOnFirstRun } from "./lib/onboarding";

export default async function Command() {
  if (await openSetupOnFirstRun()) return;
  await closeMainWindow();
  const engine = await loadEngine();
  const { prefs } = engine;

  const selection = await readSelection(prefs.autoSelect);
  if (!selection) {
    await showHUD("Select some text first");
    return;
  }

  const fixed = runFix(engine, selection.text, { explicit: !selection.auto });
  if (fixed.text === selection.text) {
    await undoAutoSelect(selection.auto);
    await showHUD("Nothing to fix");
    return;
  }

  await replaceSelection(fixed.text, prefs.restoreClipboard);
  const switched = await switchTo(engine, fixed.target);
  await remember(engine, "layout", selection.text, fixed.text, { switched, undoable: true });
  await showHUD(describeFix(fixed, prefs.showPreview));
}
