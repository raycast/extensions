import { spawnSync } from "child_process";
import * as MontereyAndBefore from "./monterey-and-before";
import * as Sonoma from "./sonoma";

function getMacosMajorVersion() {
  const { stdout } = spawnSync("sw_vers", ["-productVersion"], { encoding: "utf-8" });
  return parseInt(stdout.trim().split(".")[0]);
}

function isSonoma() {
  return getMacosMajorVersion() == 14;
}

export function areDesktopIconsHidden() {
  if (isSonoma()) {
    return Sonoma.areDesktopIconsHidden();
  } else {
    return MontereyAndBefore.areDesktopIconsHidden();
  }
}

export function hideDesktopIcons() {
  if (isSonoma()) {
    Sonoma.hideDesktopIcons();
  } else {
    MontereyAndBefore.hideDesktopIcons();
  }
}

export function showDesktopIcons() {
  if (isSonoma()) {
    Sonoma.showDesktopIcons();
  } else {
    MontereyAndBefore.showDesktopIcons();
  }
}

export function areDesktopWidgetsHidden() {
  if (isSonoma()) {
    return Sonoma.areDesktopWidgetsHidden();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}

export function hideDesktopWidgets() {
  if (isSonoma()) {
    Sonoma.hideDesktopWidgets();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}

export function showDesktopWidgets() {
  if (isSonoma()) {
    Sonoma.showDesktopWidgets();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}
