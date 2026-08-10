import { spawnSync } from "child_process";

export function areDesktopIconsHidden() {
  const { stdout } = spawnSync("defaults", ["read", "com.apple.finder", "CreateDesktop"], {
    encoding: "utf-8",
  });
  return stdout.trim() === "false";
}

export function hideDesktopIcons() {
  spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "false"]);
  spawnSync("killall", ["Finder"]);
}

export function showDesktopIcons() {
  spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "true"]);
  spawnSync("killall", ["Finder"]);
}
