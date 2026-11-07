import { showHUD } from "@raycast/api";
import { languageName } from "./lib/engine";
import { getInputSources, selectLayout } from "./lib/macos";
import { openSetupOnFirstRun } from "./lib/onboarding";

export default async function Command() {
  if (await openSetupOnFirstRun()) return;
  const { enabled, current } = await getInputSources();
  if (!enabled.en || !enabled.fa) {
    await showHUD("Add both an English and a Persian keyboard layout in System Settings");
    return;
  }
  const target = current?.lang === "fa" ? "en" : "fa";
  await selectLayout(target);
  await showHUD(`Keyboard: ${languageName(target)}`);
}
