import { LocalStorage, showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  applyHotCornerSettings,
  DISABLED_CORNER,
  isDisabledState,
  readHotCornerSettings,
  tryParseHotCornerSettingsJson,
} from "./lib/hot-corners";
import { TOGGLE_BACKUP_KEY, TOGGLE_DISABLED_KEY } from "./lib/toggle-storage";

/**
 * "Disabled" in the command subtitle if the user turned off corners via this extension (local flag)
 * or the Dock prefs are already all hot-corner–disabled (same state as a full disable).
 */
async function isHotCornersEffectivelyDisabled(): Promise<boolean> {
  const storageOff = (await LocalStorage.getItem(TOGGLE_DISABLED_KEY)) === "true";
  if (storageOff) return true;
  return isDisabledState(readHotCornerSettings());
}

/** Raycast only supports updating the command subtitle at runtime, not the manifest description. */
async function syncToggleCommandSubtitle(): Promise<void> {
  const disabled = await isHotCornersEffectivelyDisabled();
  await updateCommandMetadata({
    subtitle: disabled ? "Disabled" : "Enabled",
  });
}

export default async function ToggleHotCornersCommand() {
  try {
    const disabledFlag = await LocalStorage.getItem(TOGGLE_DISABLED_KEY);
    const isOff = disabledFlag === "true";

    if (!isOff) {
      const current = readHotCornerSettings();
      if (isDisabledState(current)) {
        await showHUD("Hot corners are already off");
        return;
      }

      await LocalStorage.setItem(TOGGLE_BACKUP_KEY, JSON.stringify(current));
      applyHotCornerSettings({
        tl: DISABLED_CORNER,
        tr: DISABLED_CORNER,
        bl: DISABLED_CORNER,
        br: DISABLED_CORNER,
      });
      await LocalStorage.setItem(TOGGLE_DISABLED_KEY, "true");
      await showHUD("Hot corners disabled");
      return;
    }

    const backup = tryParseHotCornerSettingsJson((await LocalStorage.getItem(TOGGLE_BACKUP_KEY)) ?? undefined);
    if (!backup) {
      await LocalStorage.removeItem(TOGGLE_DISABLED_KEY);
      await showToast({
        style: Toast.Style.Failure,
        title: "No saved configuration",
        message: "Backup was missing; hot corners stay as they are.",
      });
      return;
    }

    applyHotCornerSettings(backup);
    await LocalStorage.removeItem(TOGGLE_DISABLED_KEY);
    await LocalStorage.removeItem(TOGGLE_BACKUP_KEY);
    await showHUD("Hot corners restored");
  } finally {
    await syncToggleCommandSubtitle();
  }
}
