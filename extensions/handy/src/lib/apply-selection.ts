import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { restartHandyAction } from "./restart-handy";

const LIVE_SWITCH_HINT =
  "Grant Raycast Accessibility access (System Settings → Privacy & Security), or restart Handy to apply.";

/**
 * Apply a model/language change to the running Handy app, then persist.
 *
 * Handy does not re-read `settings_store.json` while running, so writing the
 * file before the live switch succeeds would make the next command launch
 * think the new value is already active — blocking retry and the restart
 * fallback. Persist (and mark the UI current) only after the live switch
 * succeeds, or as part of the Restart Handy fallback.
 */
export async function applyLiveOrRestart(options: {
  isCurrent: boolean;
  alreadyActiveMessage: string;
  persist: () => void;
  markCurrent: () => void;
  liveSwitch: () => Promise<boolean>;
  successMessage: string;
  failureTitle: string;
}): Promise<void> {
  if (options.isCurrent) {
    await showHUD(options.alreadyActiveMessage);
    return;
  }

  const { handyBinaryPath } = getPreferenceValues<Preferences>();
  const applied = await options.liveSwitch();
  if (applied) {
    options.persist();
    options.markCurrent();
    await showHUD(options.successMessage);
    return;
  }

  await showToast({
    style: Toast.Style.Failure,
    title: options.failureTitle,
    message: LIVE_SWITCH_HINT,
    primaryAction: restartHandyAction(
      options.persist,
      handyBinaryPath,
      options.markCurrent,
    ),
  });
}
