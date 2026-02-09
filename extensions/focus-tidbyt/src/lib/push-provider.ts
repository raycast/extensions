import { ExtensionPreferences } from "./preferences";
import {
  pushImage as pushTronbytImage,
  removeInstallation as removeTronbytInstallation,
} from "./tronbyt";
import {
  pushImage as pushTidbytImage,
  removeInstallation as removeTidbytInstallation,
} from "./tidbyt";

export type PushProvider = "tidbyt" | "tronbyt";

export function getPushProvider(prefs: ExtensionPreferences): PushProvider {
  return prefs.pushProvider === "tidbyt" ? "tidbyt" : "tronbyt";
}

export function getPushProviderLabel(
  prefs: ExtensionPreferences
): "Tidbyt" | "Tronbyt" {
  return getPushProvider(prefs) === "tidbyt" ? "Tidbyt" : "Tronbyt";
}

export function hasPushConfig(prefs: ExtensionPreferences): boolean {
  const provider = getPushProvider(prefs);
  if (provider === "tidbyt") {
    return Boolean(
      prefs.tidbytDeviceId?.trim() && prefs.tidbytApiToken?.trim()
    );
  }
  return Boolean(prefs.tronbytBaseUrl?.trim() && prefs.tronbytDeviceId?.trim());
}

export function getMissingConfigMessage(prefs: ExtensionPreferences): string {
  const provider = getPushProvider(prefs);
  if (provider === "tidbyt") {
    return "Tidbyt Device ID and API Key are required to push updates. Configure them in the extension preferences.";
  }
  return "Tronbyt Base URL and Device ID are required to push updates. Configure them in the extension preferences.";
}

export async function pushImage(
  prefs: ExtensionPreferences,
  installationId: string,
  base64Webp: string
): Promise<void> {
  const provider = getPushProvider(prefs);
  if (provider === "tidbyt") {
    await pushTidbytImage(prefs, installationId, base64Webp);
    return;
  }
  await pushTronbytImage(prefs, installationId, base64Webp);
}

export async function removeInstallation(
  prefs: ExtensionPreferences,
  installationId: string
): Promise<void> {
  const provider = getPushProvider(prefs);
  if (provider === "tidbyt") {
    await removeTidbytInstallation(prefs, installationId);
    return;
  }
  await removeTronbytInstallation(prefs, installationId);
}
