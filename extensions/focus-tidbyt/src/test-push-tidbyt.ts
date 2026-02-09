import {
  Clipboard,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { getPreferences } from "./lib/preferences";
import { renderCountdownBase64 } from "./lib/render";
import { toErrorMessage } from "./lib/errors";
import {
  getMissingConfigMessage,
  getPushProviderLabel,
  hasPushConfig,
  pushImage,
} from "./lib/push-provider";
import { getTidbytAuthDebugInfo } from "./lib/tidbyt";

export default async function Command() {
  const prefs = getPreferences();
  const providerLabel = getPushProviderLabel(prefs);
  if (!hasPushConfig(prefs)) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${providerLabel} not configured`,
      message: getMissingConfigMessage(prefs),
    });
    await openExtensionPreferences();
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Pushing ${providerLabel} test`,
  });

  try {
    const base64Webp = await renderCountdownBase64({
      text: "10/10m",
      progress: 0.5,
      title: "TEST PUSH",
      nowMs: Date.now(),
      startEpochMs: Date.now(),
    });
    const installationId = prefs.installationId?.trim() || "raycast-focus-test";
    await pushImage(prefs, installationId, base64Webp);
    toast.style = Toast.Style.Success;
    toast.title = `${providerLabel} test pushed`;
    toast.message = "It may take a moment to appear in the rotation.";
  } catch (error) {
    console.error(error);
    const debugInfo =
      providerLabel === "Tidbyt"
        ? `\nAuth debug: ${getTidbytAuthDebugInfo(prefs.tidbytApiToken)}`
        : "";
    await Clipboard.copy(`${toErrorMessage(error)}${debugInfo}`);
    toast.style = Toast.Style.Failure;
    toast.title = `${providerLabel} test failed`;
    toast.message = "Error (with auth debug) copied to clipboard.";
  }
}
