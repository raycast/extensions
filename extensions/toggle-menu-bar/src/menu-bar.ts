import { launchCommand, LaunchType, updateCommandMetadata } from "@raycast/api";
import { applyMode, currentMode, toggleModes } from "swift:../swift/menu-bar-helper";

export const MENU_BAR_MODES = [
  {
    value: "always",
    label: "Always",
    description: "Hide the menu bar on the desktop and in full screen.",
  },
  {
    value: "desktop-only",
    label: "On Desktop Only",
    description: "Hide the menu bar on the desktop; show it in full screen.",
  },
  {
    value: "fullscreen-only",
    label: "In Full Screen Only",
    description: "Show the menu bar on the desktop; hide it in full screen.",
  },
  {
    value: "never",
    label: "Never",
    description: "Keep the menu bar visible everywhere.",
  },
] as const;

export type MenuBarMode = (typeof MENU_BAR_MODES)[number]["value"];

export interface MenuBarStatus {
  mode: MenuBarMode;
  label: string;
}

// The Swift helper returns the mode macOS reports after reading or applying it.
function statusFor(mode: string): MenuBarStatus {
  const definition = MENU_BAR_MODES.find((candidate) => candidate.value === mode);
  if (!definition) throw new Error(`Unknown menu bar mode: ${mode}`);
  return { mode: definition.value, label: definition.label };
}

export async function readMenuBarStatus() {
  return statusFor(await currentMode());
}

export async function setMenuBarMode(mode: MenuBarMode) {
  return statusFor(await applyMode(mode));
}

export async function toggleMenuBarModes(firstMode: MenuBarMode, secondMode: MenuBarMode) {
  return statusFor(await toggleModes(firstMode, secondMode));
}

export async function updateCommandSubtitle(subtitle: string) {
  try {
    await updateCommandMetadata({ subtitle });
  } catch (error) {
    console.error("Couldn’t update command subtitle", error);
  }
}

export function updateStatusSubtitle(label: string) {
  return updateCommandSubtitle(`Current: ${label}`);
}

export async function refreshStatusSubtitle() {
  const status = await readMenuBarStatus();
  await updateStatusSubtitle(status.label);
  return status;
}

export async function refreshToggleCommandSubtitle() {
  try {
    await launchCommand({
      name: "toggle",
      type: LaunchType.Background,
    });
  } catch (error) {
    console.error("Couldn’t refresh toggle command subtitle", error);
  }
}

export function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
