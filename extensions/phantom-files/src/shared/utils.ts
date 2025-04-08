import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export async function getSelectedPath(): Promise<string | null> {
  try {
    const selectedItems = await getSelectedPaths();
    return selectedItems[0] || null;
  } catch {
    return null;
  }
}

export async function getSelectedPaths(): Promise<string[]> {
  try {
    const selectedItems = await getSelectedFinderItems();
    return selectedItems.map((item) => item.path);
  } catch {
    return [];
  }
}

export async function getFileOrFolderName(path: string) {
  const name = await runAppleScript(`do shell script "basename '${path}'"`);
  console.log("name", name);
  return name.trim();
}

export async function hideItem(path: string) {
  await runAppleScript(`do shell script "chflags hidden '${path.replace(/'/g, "'\\\\''")}'" && killall Finder`);
}

export async function unhideItem(path: string) {
  await runAppleScript(`do shell script "chflags nohidden '${path.replace(/'/g, "'\\\\''")}'" && killall Finder`);
}

export async function toggleGlobalHiddenFiles() {
  const currentSetting = await runAppleScript('do shell script "defaults read com.apple.finder AppleShowAllFiles"');
  const newSetting = currentSetting.trim() === "1" ? "false" : "true";

  await runAppleScript(`
    do shell script "defaults write com.apple.finder AppleShowAllFiles -bool ${newSetting} && killall Finder"
  `);

  await showHUD(`👻 ${newSetting === "true" ? "Showing" : "Hiding"} all hidden files`);
}
