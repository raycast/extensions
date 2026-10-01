import { getPreferenceValues, LocalStorage, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { discoverDesks, getDeskStatus, moveDesk, nudgeDesk, stopDesk } from "swift:../swift";

export type DeskStatus = { id: string; name: string; heightCm: number; cancelled: boolean };
export type DiscoveredDesk = { id: string; name: string; rssi?: number; connected: boolean };

export { discoverDesks };

const SELECTED_DESK_KEY = "selectedDeskId";
// Overrides the desk identifier preference with a desk picked in Select Desk or found instead, as `{ from, to }`.
const REPLACED_PREFERENCE_KEY = "replacedDeskPreference";

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

/** The desk picked in Select Desk (or found instead of a stale preference), then the preference. Empty means "find one". */
export async function getDeskId() {
  const preference = getPreferenceValues<Preferences>().uuid?.trim();
  if (preference) return (await getReplacement(preference)) ?? preference;
  return (await LocalStorage.getItem<string>(SELECTED_DESK_KEY)) ?? "";
}

async function getReplacement(preference: string) {
  const stored = await LocalStorage.getItem<string>(REPLACED_PREFERENCE_KEY);
  if (!stored) return undefined;
  try {
    const { from, to } = JSON.parse(stored) as { from: string; to: string };
    return from === preference ? to : undefined;
  } catch {
    return undefined;
  }
}

/** Remembers the desk that was used when none or a different one was requested, so later commands go straight to it. */
async function rememberUsedDesk(requestedId: string, usedId: string) {
  if (requestedId) {
    if (usedId !== requestedId) await selectDesk(usedId);
  } else if (!(await getDeskId())) {
    // Keep an automatically found desk, unless the user picked one while the command was still running.
    await selectDesk(usedId);
  }
}

/** Saves the desk to control. The preference can't be changed from code, so a set one is overridden instead. */
export async function selectDesk(id: string) {
  const preference = getPreferenceValues<Preferences>().uuid?.trim();
  if (preference) {
    await LocalStorage.setItem(REPLACED_PREFERENCE_KEY, JSON.stringify({ from: preference, to: id }));
  } else {
    await LocalStorage.setItem(SELECTED_DESK_KEY, id);
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
    // Remember the desk that was actually used so the next command doesn't have to scan for it.
    await rememberUsedDesk(deskId, status.id);
    if (status.cancelled) {
      // A newer command took over before the desk reached its target, so this isn't a success.
      toast.style = Toast.Style.Failure;
      toast.title = "Move cancelled";
      toast.message = `A newer command took over at ${status.heightCm.toFixed(1)} cm`;
      return `${toast.title}: ${toast.message}`;
    }
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
