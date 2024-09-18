import { LocalStorage, environment } from "@raycast/api";
import path from "path";
import { ADVANCED_SETTINGS_FILENAME } from "./common/constants";
import { defaultAdvancedSettings } from "../data/default-advanced-settings";
import * as fs from "fs";

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
 * Immediately loads the advanced settings from the advanced settings file.
 * @returns The advanced settings object.
 */
export const loadAdvancedSettingsSync = () => {
  try {
    const advancedSettingsValues = JSON.parse(
      fs.readFileSync(path.join(environment.supportPath, ADVANCED_SETTINGS_FILENAME), "utf-8"),
    ) as typeof defaultAdvancedSettings;
    return advancedSettingsValues;
  } catch (error) {
    console.error(error);
  }
  return defaultAdvancedSettings;
};
