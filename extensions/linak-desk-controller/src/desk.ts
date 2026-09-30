import { getPreferenceValues, LocalStorage, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { discoverDesks, getDeskStatus, moveDesk, nudgeDesk, stopDesk } from "swift:../swift";

export type DeskStatus = { id: string; name: string; heightCm: number };
export type DiscoveredDesk = { id: string; name: string; rssi?: number; connected: boolean };

export { discoverDesks };

const SELECTED_DESK_KEY = "selectedDeskId";

function parseCm(value: string | undefined, label: string, fallback?: number) {
  if (!value?.trim() && fallback !== undefined) return fallback;
  const number = Number(value?.replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`"${value ?? ""}" isn't a valid ${label}. Update it in the extension preferences.`);
  }
  return number;
}

function getBaseHeight() {
  return parseCm(getPreferenceValues<Preferences>().baseHeight, "lowest height", 62);
}

/** The desk identifier preference wins, then the desk picked in Select Desk. Empty means "find one". */
export async function getDeskId() {
  const preference = getPreferenceValues<Preferences>().uuid?.trim();
  if (preference) return preference;
  return (await LocalStorage.getItem<string>(SELECTED_DESK_KEY)) ?? "";
}

export async function selectDesk(id: string | undefined) {
  if (id) {
    await LocalStorage.setItem(SELECTED_DESK_KEY, id);
  } else {
    await LocalStorage.removeItem(SELECTED_DESK_KEY);
  }
}

export async function getStatus(): Promise<DeskStatus> {
  return getDeskStatus(await getDeskId(), getBaseHeight());
}

/** Shows progress in a toast and returns a summary, which AI tools pass back to the model. */
async function runDeskCommand(title: string, command: (deskId: string) => Promise<DeskStatus>) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const deskId = await getDeskId();
    if (!deskId) toast.message = "Looking for your desk…";
    const status = await command(deskId);
    // Remember an automatically found desk so the next command doesn't have to scan for it.
    if (!deskId) await selectDesk(status.id);
    toast.style = Toast.Style.Success;
    toast.title = `Desk at ${status.heightCm.toFixed(1)} cm`;
    return toast.title;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Desk command failed";
    toast.message = error instanceof Error ? error.message : String(error);
    toast.primaryAction = { title: "Open Extension Preferences", onAction: openExtensionPreferences };
    return `${toast.title}: ${toast.message}`;
  }
}

export async function moveTo(heightCm: number) {
  return runDeskCommand(`Moving desk to ${heightCm} cm`, (deskId) => moveDesk(deskId, heightCm, getBaseHeight()));
}

export async function moveToPreset(preset: "sit" | "stand") {
  const preferences = getPreferenceValues<Preferences>();
  const title = preset === "sit" ? "Sitting down" : "Standing up";
  return runDeskCommand(title, (deskId) => {
    const height =
      preset === "sit"
        ? parseCm(preferences.sitHeight, "sitting height")
        : parseCm(preferences.standHeight, "standing height");
    return moveDesk(deskId, height, getBaseHeight());
  });
}

export async function nudge(direction: 1 | -1) {
  await runDeskCommand(direction > 0 ? "Raising desk" : "Lowering desk", (deskId) => {
    const step = parseCm(getPreferenceValues<Preferences>().stepSize, "raise/lower step", 5);
    return nudgeDesk(deskId, direction * step, getBaseHeight());
  });
}

export async function stop() {
  await runDeskCommand("Stopping desk", (deskId) => stopDesk(deskId, getBaseHeight()));
}
