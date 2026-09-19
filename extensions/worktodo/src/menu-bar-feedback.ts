import { LaunchType, showHUD, showToast, type Toast } from "@raycast/api";

function hudTitle(options: Toast.Options): string {
  return options.message ? `${options.title}: ${options.message}` : options.title;
}

export async function showMenuBarFeedback(launchType: LaunchType, options: Toast.Options): Promise<void> {
  if (launchType === LaunchType.Background) {
    try {
      await showHUD(hudTitle(options));
    } catch (error) {
      console.error("Unable to show menu bar HUD", error);
    }
    return;
  }

  try {
    await showToast(options);
  } catch (error) {
    console.error("Unable to show menu bar Toast", error);
    try {
      await showHUD(hudTitle(options));
    } catch (fallbackError) {
      console.error("Unable to show fallback menu bar HUD", fallbackError);
    }
  }
}
