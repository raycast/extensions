import { launchCommand, LaunchType } from "@raycast/api";

export async function refreshMenuBar() {
  // wrapping this in a try/catch because users who don't have the
  // menu command active will get an error, so we can just ignore it
  try {
    await launchCommand({
      name: "unread-menu-bar",
      type: LaunchType.Background,
    });
  } catch {
    return;
  }
}
