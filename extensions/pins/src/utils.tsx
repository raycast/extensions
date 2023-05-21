import { useEffect, useState } from "react";
import { LocalStorage, Icon, Clipboard, showToast, open, popToRoot } from "@raycast/api";
import { exec, execSync } from "child_process";
import { StorageKey } from "./constants";
import { Pin, Group } from "./types";
import * as os from "os";
import { runAppleScript } from "run-applescript";

/**
 * A map of icon names to icon objects.
 */
export const iconMap: { [index: string]: Icon } = Icon;

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
 * Gets the stored groups.
 * @returns The list of groups alongside an update function.
 */
export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>();

  useEffect(() => {
    Promise.resolve(getStorage(StorageKey.LOCAL_GROUPS)).then((storedGroups) => {
      setGroups(storedGroups);
    });
  }, []);

  return [groups, setGroups];
};

/**
 * Gets the stored pins.
 * @returns The list of pins alongside an update function.
 */
export const usePins = () => {
  const [pins, setPins] = useState<Pin[]>();

  useEffect(() => {
    Promise.resolve(getStorage(StorageKey.LOCAL_PINS)).then((storedPins) => {
      setPins(storedPins);
    });
  }, []);

  return [pins, setPins];
};

/**
 * Copies the pin data to the clipboard.
 * @returns A promise resolving to the JSON string of the pin data.
 */
export const copyPinData = async () => {
  const pins = await getStorage(StorageKey.LOCAL_PINS);
  const groups = await getStorage(StorageKey.LOCAL_GROUPS);

  const data = {
    groups: groups,
    pins: pins,
  };

  const jsonData = JSON.stringify(data);
  await Clipboard.copy(jsonData);
  return jsonData;
};

/**
 * Opens a pin.
 * @param pin The pin to open.
 * @param preferences The extension preferences object.
 */
export const openPin = async (pin: Pin, preferences: { preferredBrowser: string }) => {
  try {
    const target = pin.url.startsWith("~") ? pin.url.replace("~", os.homedir()) : pin.url;
    const isPath = pin.url.startsWith("/") || pin.url.startsWith("~");
    if (isPath) {
      open(target);
    } else {
      open(target, preferences.preferredBrowser);
    }
  } catch (error) {
    await showToast({
      title: "Failed to open " + (pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)),
    });
  }
};

/**
 * Creates a new pin; updates local storage.
 * @param name The name of the pin.
 * @param url The URL or path of the pin.
 * @param icon The icon for the pin.
 * @param group The group the pin belongs to.
 */
export const createNewPin = async (name: string, url: string, icon: string, group: string) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  const newID = (await getStorage(StorageKey.NEXT_PIN_ID))[0];
  setStorage(StorageKey.NEXT_PIN_ID, [newID + 1]);

  const newData = [...storedPins];
  newData.push({
    name: name,
    url: url,
    icon: icon,
    group: group,
    id: newID,
  });

  await setStorage(StorageKey.LOCAL_PINS, newData);
  await showToast({ title: `Added pin for "${name}"` });
  popToRoot();
};

/**
 * Gets the current Finder directory.
 * @returns A promise resolving to the path of the current directory as a string.
 */
export const getCurrentDirectory = async (): Promise<string[]> => {
  const data = await runAppleScript(`tell application "Finder"
    return {name, POSIX path} of (insertion location as alias)
  end tell`);
  return data.split(", ");
};
