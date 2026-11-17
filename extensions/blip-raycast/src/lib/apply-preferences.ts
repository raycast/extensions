/** Pushes the Blip settings chosen in Raycast's extension preferences into Blip. */
import { getPreferenceValues, LocalStorage, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { setAutoAccept, setDefaultSavePath, setSaveToPhotos, setSpeedLimits } from "./actions";
import { pendingConfigChanges, type BlipPreferenceValues, type ConfigChange } from "./blip-preferences";
import { isMac } from "./endpoint";
import type { Config } from "./types";

let appliedThisLaunch = false;

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

const APPLIED_KEY = "appliedBlipPreferences";

/** Runs once per command launch, as soon as Blip's config is known. */
export async function applyBlipPreferences(config: Config | undefined) {
  if (appliedThisLaunch || !config) return;
  appliedThisLaunch = true;
  const current: BlipPreferenceValues = getPreferenceValues<Preferences>();
  const stored = await LocalStorage.getItem<string>(APPLIED_KEY);
  let lastApplied: BlipPreferenceValues = {};
  try {
    lastApplied = stored ? (JSON.parse(stored) as BlipPreferenceValues) : {};
  } catch {
    // Unreadable record: treat every setting as not yet pushed.
  }
  const { changes, problems, applied } = pendingConfigChanges(current, config, {
    supportsPhotos: isMac,
    lastApplied,
  });
  try {
    for (const change of changes) await dispatch(change);
    await LocalStorage.setItem(APPLIED_KEY, JSON.stringify(applied));
  } catch (error) {
    problems.push(`Couldn't update Blip: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (problems.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Check Blip Settings in Preferences",
      message: problems.join(" "),
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
  }
}
