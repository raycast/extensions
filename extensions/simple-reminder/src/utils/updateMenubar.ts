import { launchCommand, LaunchType } from "@raycast/api";

export async function updateMenubar() {
  try {
    await launchCommand({ name: "reminderMenuBar", type: LaunchType.Background });
  } catch {
    // Silent fail, since this will automatically update in 1 minute or when the user clicks the reminder menu bar
  }
}
