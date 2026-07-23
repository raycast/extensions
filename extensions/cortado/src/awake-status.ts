import { LaunchType, environment, showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { TOAST_TITLE, UNAVAILABLE_LABEL, ensureAwakeAvailable, readAwakeSettings, statusLabel } from "./lib/awake";

/**
 * This command is the live status indicator: `interval` in package.json
 * schedules it to run on its own every tick, and each run's only job is to
 * refresh this command's own subtitle to the current PowerToys Awake state
 * (updateCommandMetadata can only ever update the metadata of the command
 * that's currently running — there's no cross-command variant — so the
 * subtitle has to be kept fresh from inside this command specifically).
 *
 * Background refresh is opt-in per install: it only starts once a user has
 * opened this command manually (or enabled it in preferences), which is why
 * a user-initiated run does the full guard (including the process check)
 * and reports failures with a toast/HUD, while a background tick stays
 * completely silent on failure — popping a toast every 10s-1m because
 * PowerToys isn't installed would be intolerable. See `ensureAwakeAvailable`
 * in lib/awake.ts for why the background tick can skip the process check
 * specifically (cost/staleness tradeoff), not the module-enabled check.
 */
export default async function Command() {
  const isBackground = environment.launchType === LaunchType.Background;

  try {
    ensureAwakeAvailable({ checkProcess: !isBackground });
    const current = readAwakeSettings();
    const label = statusLabel(current.properties);
    await updateCommandMetadata({ subtitle: label });

    if (!isBackground) {
      await showHUD(label);
    }
  } catch (error) {
    await updateCommandMetadata({ subtitle: UNAVAILABLE_LABEL }).catch(() => {});

    if (!isBackground) {
      await showToast({
        style: Toast.Style.Failure,
        title: TOAST_TITLE,
        message: (error as Error).message,
      });
    }
  }
}
