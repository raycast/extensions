import { Cache, closeMainWindow, launchCommand, LaunchType } from "@raycast/api";

const cache = new Cache();

export default async function clearFocus() {
  cache.set("current-focus", "");
  await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  await closeMainWindow();
}
