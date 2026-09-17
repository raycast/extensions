import * as appleScriptUtils from "./applescript-utils";
import * as windowsUtils from "./windows-utils";

const utils = process.platform === "win32" ? windowsUtils : appleScriptUtils;

export const { getBrowserSetup, getBrowsersTabs, jumpToBrowserTab, closeBrowserTab } = utils;
