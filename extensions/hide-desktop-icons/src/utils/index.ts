import { exec } from "child_process";
import { promisify } from "util";

const execp = promisify(exec);

export async function hideIcons() {
  await execp("defaults write com.apple.finder CreateDesktop -bool false && killall Finder");
}
export async function showIcons() {
  await execp("defaults write com.apple.finder CreateDesktop -bool true && killall Finder");
}

export async function toggleIconsVisibility() {
  const { stdout } = await execp("defaults read com.apple.finder CreateDesktop");
  const isHidden = stdout.trim() === "0";
  if (isHidden) {
    await showIcons();
    return 'show'
  } else {
    await hideIcons();
    return 'hide'
  }
}
