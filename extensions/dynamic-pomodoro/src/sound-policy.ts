import type { LaunchType } from "@raycast/api";

export type SoundMode = "always" | "background-only" | "off";

const BACKGROUND_LAUNCH_TYPE = "background";

export function normalizeSoundMode(rawMode: string | undefined): SoundMode {
  if (rawMode === "background-only" || rawMode === "off") {
    return rawMode;
  }

  return "always";
}

export function shouldPlaySound({
  soundMode,
  launchType,
}: {
  soundMode: SoundMode;
  launchType: LaunchType | string | undefined;
}): boolean {
  if (soundMode === "off") {
    return false;
  }

  if (soundMode === "always") {
    return true;
  }

  return String(launchType) === BACKGROUND_LAUNCH_TYPE;
}
