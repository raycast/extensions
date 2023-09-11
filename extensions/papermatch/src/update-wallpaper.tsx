import { getPreferenceValues } from "@raycast/api";
import { runAppleScriptSilently, wallpaperPathsAreValid, showBadPathsFailureToast } from "./utils";
import { Preferences } from "./preferences";

/**
 * Builds AppleScript to toggle the system's appearance while changing the wallpaper to the
 * matching image for each appearance mode.
 *
 * @param lightModeWallPath - The path to the image used for light mode wallpaper set by the user.
 * @param darkModeWallPath - The path to the image used for dark mode wallpaper set by the user.
 * @returns Generated AppleScript.
 */
export function applyWallpaperUpdate(lightModeWallPath: string, darkModeWallPath: string) {
  return `tell application "System Events"
            tell appearance preferences
              if dark mode then
                tell application "System Events"
                  tell every desktop
                    set picture to "${darkModeWallPath}/"
                  end tell
                end tell
              else
                tell application "System Events"
                  tell every desktop
                    set picture to "${lightModeWallPath}/"
                  end tell
                end tell
              end if
            end tell
          end tell`;
}

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  const light = preferences.lightModePath;
  const dark = preferences.darkModePath;

  const wallPathsAreValid = wallpaperPathsAreValid(light, dark);

  if (wallPathsAreValid) {
    const script = applyWallpaperUpdate(light, dark);
    await runAppleScriptSilently(script);
  } else {
    await showBadPathsFailureToast();
  }
};
