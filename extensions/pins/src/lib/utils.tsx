import { LocalStorage } from "@raycast/api";
import { exec, execSync } from "child_process";
import { runAppleScript } from "@raycast/utils";

/**
 * Preferences for the entire extension.
 */
export interface ExtensionPreferences {
  /**
   * The user's preferred browser. This is used to open URL pins.
   */
  preferredBrowser: string;

  /**
   * The first section displayed in lists of pins, e.g. grouped-pins-first or ungrouped-pins-first.
   */
  topSection: string;

  /**
   * Whether or not to show the recent applications section in lists of pins.
   */
  showRecentApplications: boolean;

  /**
   * The default sort strategy for lists of pins outside of groups.
   */
  defaultSortStrategy: string;
}

/**
 * Sets the value of a local storage key.
 * @param key The key to set the value of.
 * @param value The string value to set the key to.
 */
export const setStorage = async (key: string, value: unknown) => {
  await LocalStorage.setItem(key, JSON.stringify(value));
};

/**
 * Gets the value of a local storage key.
 * @param key The key to get the value of.
 * @returns The JSON-parsed value of the key.
 */
export const getStorage = async (key: string) => {
  const localStorage = await LocalStorage.getItem<string>(key);
  const storageString = typeof localStorage === "undefined" ? "" : localStorage;
  return storageString == "" ? [] : JSON.parse(storageString);
};

/**
 * Runs a terminal command asynchronously.
 * @param command The command to run.
 * @param callback A callback function to run on each line of output.
 */
export const runCommand = async (command: string, callback?: (arg0: string) => unknown) => {
  const child = exec(command);
  let result = "";

  child.stdout?.on("data", (data: string) => {
    result = result + data;
    callback?.(result);
  });

  while (child.stdout?.readable) {
    await new Promise((r) => setTimeout(r, 100));
  }

  return result;
};

/**
 * Runs a terminal command synchronously.
 * @param command The command to run.
 * @returns The result of the command as a string.
 */
export const runCommandSync = (command: string) => {
  const result = execSync(command);
  return result.toString();
};

/**
 * Runs Terminal command in a new Terminal tab.
 * @param command The command to run.
 * @returns A promise resolving to the output of the command as a string.
 */
export const runCommandInTerminal = async (command: string): Promise<string> => {
  const output = await runAppleScript(`tell application "Terminal"
    try
      activate
      do script "${command.replaceAll('"', '\\"')}"
    end try
  end tell`);
  return output;
};

/**
 * Cuts off a string at a certain length, adding an ellipsis if necessary.
 * @param str The string to modify.
 * @param cutoff The maximum length of the string.
 * @returns The modified string.
 */
export const cutoff = (str: string, cutoff: number) => {
  return `${str.substring(0, cutoff)}${str.length > cutoff ? "..." : ""}`;
};
