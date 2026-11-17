/** Pushes the Blip settings chosen in Raycast's extension preferences into Blip. */
import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { setAutoAccept, setDefaultSavePath, setSaveToPhotos, setSpeedLimits } from "./actions";
import { pendingConfigChanges, type BlipPreferenceValues, type ConfigChange } from "./blip-preferences";
import { isMac } from "./endpoint";
import type { Config } from "./types";

let applied = false;

function dispatch(change: ConfigChange) {
  switch (change.event) {
    case "autoAccept":
      return setAutoAccept(change.value);
    case "saveToPhotos":
      return setSaveToPhotos(change.value);
    case "saveFolder":
      return setDefaultSavePath(change.value);
    case "speedLimits":
      return setSpeedLimits({ uploadMbps: change.uploadMbps, downloadMbps: change.downloadMbps });
  }
}

/** Runs once per command launch, as soon as Blip's config is known. */
export async function applyBlipPreferences(config: Config) {
  if (applied) return;
  applied = true;
  const { changes, problems } = pendingConfigChanges(getPreferenceValues<BlipPreferenceValues>(), config, {
    supportsPhotos: isMac,
  });
  try {
    for (const change of changes) await dispatch(change);
  } catch (error) {
    problems.push(`Couldn't update Blip: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (problems.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Check Blip settings in extension preferences",
      message: problems.join(" "),
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
  }
}
