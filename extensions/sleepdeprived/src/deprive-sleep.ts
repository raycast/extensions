import { showHUD } from "@raycast/api";
import { isSleepDisabled, refreshMenuBarCommand, refreshSleepStatusCommand, setSleepDisabled } from "./utils/sleep";

export default async function Command() {
  try {
    const disabled = await isSleepDisabled();

    if (disabled) {
      await showHUD("☕ Your Mac is already sleep deprived");
      return;
    }

    await setSleepDisabled(true);

    if (!(await isSleepDisabled())) {
      throw new Error("SleepDisabled was not enabled");
    }

    await refreshSleepStatusCommand();
    await refreshMenuBarCommand().catch(() => undefined);
    await showHUD("☕ Your Mac is now sleep deprived");
  } catch {
    await showHUD("❌ Failed to deprive Mac of sleep");
  }
}
