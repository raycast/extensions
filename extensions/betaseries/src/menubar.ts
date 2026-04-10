import { LaunchType, launchCommand } from "@raycast/api";

const NEW_EPISODES_MENUBAR_COMMAND = "new-episodes-menubar";
// Error thrown by Raycast's launchCommand when the target command
// has never been opened by the user (menubar not yet activated).
const BACKGROUND_ACTIVATION_ERROR_FRAGMENT =
  "must be activated before it can be run in the background";

function isMenubarActivationError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes(BACKGROUND_ACTIVATION_ERROR_FRAGMENT)
  );
}

export async function refreshNewEpisodesMenubar() {
  try {
    await launchCommand({
      name: NEW_EPISODES_MENUBAR_COMMAND,
      type: LaunchType.Background,
    });
  } catch (error) {
    if (isMenubarActivationError(error)) {
      return;
    }

    console.error("Failed to refresh New Episodes Menu Bar", error);
  }
}
