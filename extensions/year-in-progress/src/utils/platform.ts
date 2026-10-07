import { LaunchType, launchCommand } from "@raycast/api";

export const supportsMenuBar = process.platform === "darwin";

export async function refreshMenuBar() {
  if (supportsMenuBar) {
    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  }
}

export async function refreshProgressCommands() {
  const failures: string[] = [];
  try {
    await launchCommand({ name: "year-in-progress", type: LaunchType.Background });
  } catch {
    failures.push("Progress");
  }
  try {
    await refreshMenuBar();
  } catch {
    failures.push("Menu Bar");
  }
  return failures;
}
