import { Cache, Clipboard, getSelectedText, launchCommand, LaunchType, showHUD } from "@raycast/api";

const cache = new Cache();

export default async function clipboardFocus() {
  const text = await getSelectedText();
  console.log(text);
  const focus = await Clipboard.readText();

  if (focus) {
    cache.set("current-focus", focus);
  }

  await launchCommand({ name: "menu-bar", type: LaunchType.Background });

  if (focus) {
    cache.set("last-reminder", Date.now().toString());
    await showHUD(focus);
  }
}
