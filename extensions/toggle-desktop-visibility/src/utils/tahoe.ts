import { spawnSync } from "child_process";

function restartFinder() {
  const result = spawnSync("killall", ["Finder"]);
  if (result.status !== 0) {
    throw new Error(`Failed to restart Finder: ${result.stderr?.toString().trim() || "unknown error"}`);
  }
}

function writeDesktopPref(value: boolean) {
  const result = spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "-bool", value.toString()]);
  if (result.status !== 0) {
    throw new Error(`Failed to write CreateDesktop preference: ${result.stderr?.toString().trim() || "unknown error"}`);
  }
}

export function areDesktopIconsHidden() {
  const { stdout } = spawnSync("defaults", ["read", "com.apple.finder", "CreateDesktop"], {
    encoding: "utf-8",
  });
  return stdout.trim() === "1";
}

export function hideDesktopIcons() {
  writeDesktopPref(false);
  restartFinder();
}

export function showDesktopIcons() {
  writeDesktopPref(true);
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
