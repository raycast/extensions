import { spawnSync } from "child_process";

export function areDesktopIconsHidden() {
  const { stdout } = spawnSync("defaults", ["read", "com.apple.WindowManager", "StandardHideDesktopIcons"], {
    encoding: "utf-8",
  });
  return stdout.trim() === "0";
}

export function hideDesktopIcons() {
  spawnSync("defaults", ["write", "com.apple.WindowManager", "StandardHideDesktopIcons", "-bool", "true"]);
}

export function showDesktopIcons() {
  spawnSync("defaults", ["write", "com.apple.WindowManager", "StandardHideDesktopIcons", "-bool", "false"]);
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
