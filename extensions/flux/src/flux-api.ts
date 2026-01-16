import { runAppleScript } from "@raycast/utils";

type ActionOption = "Disable" | "Color Effects";
export type DisableDuration = "for an hour" | "until sunrise" | "for full-screen apps" | "for current app";
export type ColorEffect = "Darkroom" | "Movie mode" | "macOS Dark theme at sunset";

function triggerFluxMenuItemScpt(action: ActionOption, secondAction: ColorEffect | DisableDuration) {
  return `
    tell application "System Events"
      try
        tell application process "Flux"
          click menu item "${secondAction}" of menu 1 of menu item "${action}" of menu 1 of menu bar item 1 of menu bar 2
        end tell
        return 0
      on error
        return 1
      end try
    end tell
  `;
}

async function triggerFluxMenuItem(action: ActionOption, secondAction: ColorEffect | DisableDuration) {
  const appleScript = triggerFluxMenuItemScpt(action, secondAction);
  return await runAppleScript(appleScript);
}

export async function setColorEffect(effect: ColorEffect): Promise<boolean> {
  return (await triggerFluxMenuItem("Color Effects", effect)) === "0";
}

export async function disableFluxForDuration(duration: DisableDuration): Promise<boolean> {
  return (await triggerFluxMenuItem("Disable", duration)) === "0";
}
