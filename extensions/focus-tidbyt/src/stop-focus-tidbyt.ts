import { Clipboard, Toast, showToast } from "@raycast/api";
import { getPreferences } from "./lib/preferences";
import { clearSession, getSession } from "./lib/session";
import { runShortcut } from "./lib/shortcuts";
import { toErrorMessage } from "./lib/errors";
import {
  getPushProviderLabel,
  hasPushConfig,
  removeInstallation,
} from "./lib/push-provider";

export default async function Command() {
  const prefs = getPreferences();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Stopping Focus session",
  });

  try {
    await runShortcut(
      prefs.completeShortcutName ?? "Raycast Focus - Complete",
      "",
      {
        timeoutMs: 45_000,
      }
    );
  } catch (error) {
    await Clipboard.copy(toErrorMessage(error));
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to stop Focus";
    toast.message = "Error copied to clipboard.";
    return;
  }

  try {
    const session = await getSession();
    const installationId =
      session?.installationId ?? prefs.installationId ?? "raycast-focus";
    if (hasPushConfig(prefs)) {
      await removeInstallation(prefs, installationId);
    }
  } catch (error) {
    const providerLabel = getPushProviderLabel(prefs);
    await Clipboard.copy(toErrorMessage(error));
    toast.style = Toast.Style.Failure;
    toast.title = `Focus stopped, but ${providerLabel} cleanup failed`;
    toast.message = "Error copied to clipboard.";
    await clearSession();
    return;
  }

  await clearSession();
  toast.style = Toast.Style.Success;
  toast.title = "Focus stopped";
}
