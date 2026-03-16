import { showHUD } from "@raycast/api";
import { execSync } from "node:child_process";

function readCreateDesktopValue(): boolean {
  try {
    const output = execSync("defaults read com.apple.finder CreateDesktop", { encoding: "utf8" }).trim().toLowerCase();
    return output === "1" || output === "true";
  } catch {
    // If the key is missing, Finder defaults to showing desktop icons.
    return true;
  }
}

export default async function main() {
  const isCurrentlyVisible = readCreateDesktopValue();
  const nextValue = isCurrentlyVisible ? "false" : "true";

  try {
    execSync(`defaults write com.apple.finder CreateDesktop ${nextValue} && killall Finder`, { stdio: "ignore" });
    await showHUD(isCurrentlyVisible ? "Desktop icons hidden" : "Desktop icons shown");
  } catch {
    await showHUD("Failed to toggle desktop icons");
  }

  await showHUD(isCurrentlyVisible ? "Desktop icons hidden" : "Desktop icons shown");
}
