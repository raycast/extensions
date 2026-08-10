import { spawnSync } from "child_process";
import * as MontereyAndBefore from "./monterey-and-before";
import * as Sonoma from "./sonoma";
import * as Sequoia from "./sequoia";
import * as Tahoe from "./tahoe";

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

function isTahoe() {
  return getMacosMajorVersion() === 26;
}

export function areDesktopIconsHidden() {
  if (isTahoe()) {
    return Tahoe.areDesktopIconsHidden();
  } else if (isSequoia()) {
    return Sequoia.areDesktopIconsHidden();
  } else if (isSonoma()) {
    return Sonoma.areDesktopIconsHidden();
  } else {
    return MontereyAndBefore.areDesktopIconsHidden();
  }
}

export function hideDesktopIcons() {
  if (isTahoe()) {
    Tahoe.hideDesktopIcons();
  } else if (isSequoia()) {
    Sequoia.hideDesktopIcons();
  } else if (isSonoma()) {
    Sonoma.hideDesktopIcons();
  } else {
    MontereyAndBefore.hideDesktopIcons();
  }
}

export function showDesktopIcons() {
  if (isTahoe()) {
    Tahoe.showDesktopIcons();
  } else if (isSequoia()) {
    Sequoia.showDesktopIcons();
  } else if (isSonoma()) {
    Sonoma.showDesktopIcons();
  } else {
    MontereyAndBefore.showDesktopIcons();
  }
}

export function areDesktopWidgetsHidden() {
  if (isTahoe()) {
    return Tahoe.areDesktopWidgetsHidden();
  } else if (isSequoia()) {
    return Sequoia.areDesktopWidgetsHidden();
  } else if (isSonoma()) {
    return Sonoma.areDesktopWidgetsHidden();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}

export function hideDesktopWidgets() {
  if (isTahoe()) {
    Tahoe.hideDesktopWidgets();
  } else if (isSequoia()) {
    Sequoia.hideDesktopWidgets();
  } else if (isSonoma()) {
    Sonoma.hideDesktopWidgets();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}

export function showDesktopWidgets() {
  if (isTahoe()) {
    Tahoe.showDesktopWidgets();
  } else if (isSequoia()) {
    Sequoia.showDesktopWidgets();
  } else if (isSonoma()) {
    Sonoma.showDesktopWidgets();
  } else {
    throw new Error("Not supported on Monterey and before");
  }
}
