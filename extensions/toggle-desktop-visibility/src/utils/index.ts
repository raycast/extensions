import { spawnSync } from "child_process";
import * as MontereyAndBefore from "./monterey-and-before";
import * as Sonoma from "./sonoma";
import * as Sequoia from "./sequoia"; // Assuming you have a module for Sequoia

function getMacosMajorVersion() {
  const { stdout } = spawnSync("sw_vers", ["-productVersion"], { encoding: "utf-8" });
  return parseInt(stdout.trim().split(".")[0]);
}

function isSonoma() {
  return getMacosMajorVersion() === 14;
}

function isSequoia() {
  return getMacosMajorVersion() === 15;
}

export function areDesktopIconsHidden() {
  if (isSequoia()) {
    return Sequoia.areDesktopIconsHidden();
  } else if (isSonoma()) {
    return Sonoma.areDesktopIconsHidden();
  } else {
    return MontereyAndBefore.areDesktopIconsHidden();
  }
}

export function hideDesktopIcons() {
  if (isSequoia()) {
    Sequoia.hideDesktopIcons();
  } else if (isSonoma()) {
    Sonoma.hideDesktopIcons();
  } else {
    MontereyAndBefore.hideDesktopIcons();
  }
}

export function showDesktopIcons() {
  if (isSequoia()) {
    Sequoia.showDesktopIcons();
  } else if (isSonoma()) {
    Sonoma.showDesktopIcons();
  } else {
    MontereyAndBefore.showDesktopIcons();
  }
}

export function areDesktopWidgetsHidden() {
  if (isSequoia()) {
    return Sequoia.areDesktopWidgetsHidden();
  } else if (isSonoma()) {
    return Sonoma.areDesktopWidgetsHidden();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}

export function hideDesktopWidgets() {
  if (isSequoia()) {
    Sequoia.hideDesktopWidgets();
  } else if (isSonoma()) {
    Sonoma.hideDesktopWidgets();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}

export function showDesktopWidgets() {
  if (isSequoia()) {
    Sequoia.showDesktopWidgets();
  } else if (isSonoma()) {
    Sonoma.showDesktopWidgets();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}
