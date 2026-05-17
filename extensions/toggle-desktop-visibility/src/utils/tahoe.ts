import { spawnSync } from "child_process";

function restartFinder() {
  spawnSync("killall", ["Finder"]);
}

export function areDesktopIconsHidden() {
  const { stdout } = spawnSync("defaults", ["read", "com.apple.finder", "CreateDesktop"], {
    encoding: "utf-8",
  });
  return stdout.trim() === "0";
}

export function hideDesktopIcons() {
  spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "-bool", "false"]);
  restartFinder();
}

export function showDesktopIcons() {
  spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "-bool", "true"]);
  restartFinder();
}

export function areDesktopWidgetsHidden() {
  const { stdout } = spawnSync("defaults", ["read", "com.apple.WindowManager", "StandardHideWidgets"], {
    encoding: "utf-8",
  });
  return stdout.trim() === "0";
}

export function hideDesktopWidgets() {
  spawnSync("defaults", ["write", "com.apple.WindowManager", "StandardHideWidgets", "-bool", "true"]);
}

export function showDesktopWidgets() {
  spawnSync("defaults", ["write", "com.apple.WindowManager", "StandardHideWidgets", "-bool", "false"]);
}
