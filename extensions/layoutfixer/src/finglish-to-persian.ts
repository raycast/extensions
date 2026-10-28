import { closeMainWindow, showHUD } from "@raycast/api";
import {
  getFinglish,
  loadEngine,
  readSelection,
  remember,
  replaceSelection,
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
    await showHUD("Select some Finglish text first");
    return;
  }

  const persian = getFinglish(engine).convert(selection.text);
  if (persian === selection.text) {
    await undoAutoSelect(selection.auto);
    await showHUD("No Finglish found");
    return;
  }

  await replaceSelection(persian, prefs.restoreClipboard);
  const switched = await switchTo(engine, "fa");
  await remember(engine, "finglish", selection.text, persian, switched);
  await showHUD(prefs.showPreview ? `→ فارسی: ${persian.trim().slice(0, 60)}` : "→ فارسی");
}
