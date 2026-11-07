import { Clipboard, showHUD } from "@raycast/api";
import { describeFix, loadEngine, remember, runFix } from "./lib/engine";
import { openSetupOnFirstRun } from "./lib/onboarding";

export default async function Command() {
  if (await openSetupOnFirstRun()) return;
  const clipboard = await Clipboard.readText();
  if (!clipboard) {
    await showHUD("Clipboard has no text");
    return;
  }

  const engine = await loadEngine();
  const fixed = runFix(engine, clipboard, { explicit: true });
  if (fixed.text === clipboard) {
    await showHUD("Nothing to fix");
    return;
  }
  await Clipboard.copy(fixed.text);
  await remember(engine, "layout", clipboard, fixed.text);
  await showHUD(`Copied ${describeFix(fixed, engine.prefs.showPreview)}`);
}
