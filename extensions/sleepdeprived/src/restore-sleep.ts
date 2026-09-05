import { showHUD } from "@raycast/api";
import { isSleepDisabled, refreshMenuBarCommand, refreshSleepStatusCommand, setSleepDisabled } from "./utils/sleep";

export default async function Command() {
  try {
    const disabled = await isSleepDisabled();

    if (!disabled) {
      await showHUD("💤 Your Mac can already sleep normally");
      return;
    }

    await setSleepDisabled(false);

    if (await isSleepDisabled()) {
      throw new Error("SleepDisabled was not disabled");
    }

    await refreshSleepStatusCommand();
    await refreshMenuBarCommand().catch(() => undefined);
    await showHUD("💤 Your Mac can sleep again");
  } catch {
    await showHUD("❌ Failed to restore sleep");
  }
}
