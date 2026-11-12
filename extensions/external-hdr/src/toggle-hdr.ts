import { LaunchType, environment, getPreferenceValues, showHUD, updateCommandMetadata } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { type Display, listDisplays, setHdr } from "./hdr";

export default async function toggleHdr(): Promise<void> {
  // A scheduled run must never flip the display. It only refreshes the label.
  if (environment.launchType === LaunchType.Background) {
    await refreshSubtitle();
    return;
  }

  try {
    const display = await resolveTarget();
    const isOn = await setHdr(display.id, "toggle");
    const state = isOn ? "on" : "off";

    await updateCommandMetadata({ subtitle: subtitleFor(display.name, state) });
    await showHUD(`HDR ${isOn ? "On" : "Off"} — ${display.name}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't toggle HDR" });
  }
}

function subtitleFor(displayName: string, state: "on" | "off"): string {
  return `${state === "on" ? "Disable" : "Enable"} HDR — ${displayName}`;
}

async function refreshSubtitle(): Promise<void> {
  try {
    const display = await resolveTarget();
    await updateCommandMetadata({
      subtitle: subtitleFor(display.name, display.hdr ? "on" : "off"),
    });
  } catch {
    await updateCommandMetadata({ subtitle: "No HDR display connected" }).catch(() => undefined);
  }
}

async function resolveTarget(): Promise<Display> {
  const preferences = getPreferenceValues<Preferences>();
  const wanted = preferences.displayName?.trim().toLowerCase() ?? "";
  const displays = await listDisplays();

  const display =
    wanted.length > 0
      ? displays.find((candidate) => candidate.name.trim().toLowerCase() === wanted)
      : displays.find((candidate) => !candidate.builtin && candidate.hdrCapable);

  if (display === undefined) {
    throw new Error(
      wanted.length > 0
        ? `"${preferences.displayName}" is not connected. Connect it or clear the Display Name preference.`
        : "No external HDR-capable display is connected.",
    );
  }

  if (!display.hdrCapable) {
    throw new Error(`"${display.name}" does not support HDR.`);
  }

  return display;
}
