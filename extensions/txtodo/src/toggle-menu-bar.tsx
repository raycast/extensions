import { LaunchType, LocalStorage, launchCommand, showHUD } from "@raycast/api";

const VISIBILITY_KEY = "menu-bar-visible";

export default async function ToggleMenuBar() {
  const current = await LocalStorage.getItem<string>(VISIBILITY_KEY);
  const wasVisible = current !== "false";
  const nextVisible = !wasVisible;

  await LocalStorage.setItem(VISIBILITY_KEY, String(nextVisible));

  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // Menu bar command may be disabled in Raycast preferences — nothing we can do.
  }

  await showHUD(nextVisible ? "✓ Menu bar shown" : "✓ Menu bar hidden");
}
