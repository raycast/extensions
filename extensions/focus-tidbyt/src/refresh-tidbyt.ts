import { Clipboard, Toast, showToast } from "@raycast/api";
import { getPreferences } from "./lib/preferences";
import { pushIfNeeded, getRemainingMinutes } from "./lib/update";
import { toErrorMessage } from "./lib/errors";
import { clearSession, getSession } from "./lib/session";
import {
  getPushProviderLabel,
  hasPushConfig,
  removeInstallation,
} from "./lib/push-provider";

export default async function Command() {
  const prefs = getPreferences();
  if (!hasPushConfig(prefs)) return;
  const providerLabel = getPushProviderLabel(prefs);
  const session = await getSession();
  if (!session) return;
  const remainingMinutes = getRemainingMinutes(session.endEpochMs, Date.now());
  if (remainingMinutes === 0) {
    const installationId =
      session.installationId?.trim() ||
      prefs.installationId?.trim() ||
      "raycast-focus";
    try {
      await removeInstallation(prefs, installationId);
    } catch (error) {
      console.error(error);
      await Clipboard.copy(toErrorMessage(error));
      await showToast({
        style: Toast.Style.Failure,
        title: `${providerLabel} cleanup failed`,
        message: "Error copied to clipboard.",
      });
    }
    await clearSession();
    return;
  }
  try {
    await pushIfNeeded(prefs);
  } catch (error) {
    console.error(error);
    await Clipboard.copy(toErrorMessage(error));
    await showToast({
      style: Toast.Style.Failure,
      title: `${providerLabel} update failed`,
      message: "Error copied to clipboard.",
    });
  }
}
