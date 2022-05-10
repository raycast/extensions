import { spawnSync } from "child_process";
import { showHUD } from "@raycast/api";

function toggleDesktopState(isHidden: boolean): string {
  if (isHidden) {
    spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "true"]);
    spawnSync("killall", ["Finder"]);
    return "Desktop Visible 🙉";
  }
  spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "false"]);
  spawnSync("killall", ["Finder"]);
  return "Desktop Hidden 🙈";
}

export default async function () {
  const { stdout } = spawnSync("defaults", ["read", "com.apple.finder", "CreateDesktop"], {
    encoding: "utf-8",
  });

  await showHUD(toggleDesktopState(stdout.trim() === "false"));
}
