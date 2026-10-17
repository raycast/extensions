import { showToast, Toast, showHUD, open, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { applyPreset, isInstalled, PresetRef, MfcError } from "./mfc";
import manifest from "../../package.json";

const APP_STORE_URL = "https://macs-fan-control.en.softonic.com/mac";
const VENDOR_URL = "https://crystalidea.com/macs-fan-control";

export function scratchPresetName(): string {
  const { scratchPresetName } = getPreferenceValues<Preferences>();
  return (scratchPresetName || "").trim() || "Raycast Custom";
}

/**
 * Deep link that applies a preset by name.
 *
 * A Quicklink is a URL the user triggers later from root search, so this cannot
 * use `launchCommand` — that only launches a command from inside a running one.
 * The identifiers are read from the manifest rather than written out here, so
 * renaming the extension or its author cannot leave a stale link behind.
 */
export function presetDeeplink(name: string): string {
  const args = encodeURIComponent(JSON.stringify({ preset: name }));
  return `raycast://extensions/${manifest.author}/${manifest.name}/start-fan-preset?arguments=${args}`;
}

export async function ensureInstalled(): Promise<boolean> {
  if (await isInstalled()) return true;
  await showToast({
    style: Toast.Style.Failure,
    title: "Macs Fan Control isn’t installed",
    message: "This extension drives the Macs Fan Control app.",
    primaryAction: {
      title: "Get Macs Fan Control",
      onAction: () => open(VENDOR_URL),
    },
  });
  return false;
}

/**
 * Apply a preset with progress feedback.
 *
 * Applying restarts Macs Fan Control (it only reads its preferences at launch),
 * which takes a couple of seconds — hence the animated toast.
 */
export async function applyPresetWithFeedback(ref: PresetRef, label: string): Promise<boolean> {
  if (!(await ensureInstalled())) return false;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Applying “${label}”…`,
    message: "Restarting Macs Fan Control",
  });

  try {
    await applyPreset(ref);
    toast.style = Toast.Style.Success;
    toast.title = `Fans set to “${label}”`;
    toast.message = undefined;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not apply preset";
    toast.message = error instanceof MfcError ? error.message : String(error);
    return false;
  }
}

/** Same as above, but for no-view commands where a HUD is the right feedback. */
export async function applyPresetAsHud(ref: PresetRef, label: string): Promise<void> {
  if (!(await ensureInstalled())) return;
  await closeMainWindow();
  try {
    await applyPreset(ref);
    await showHUD(`🌀  Fans set to “${label}”`);
  } catch (error) {
    await showHUD(`⚠️  ${error instanceof MfcError ? error.message : "Could not apply preset"}`);
  }
}

export { APP_STORE_URL, VENDOR_URL };
