/**
 * @file utilities/utils.ts
 *
 * @summary Helper functions used throughout the extension.
 * @author Felix Jen <felix@fjlaboratories.com>
 *
 * Created at     : 2024-01-12 17:00:00
 * Last modified  : 2024-01-12 17:00:00
 */


import * as fs from "fs";


import { runAppleScript } from "run-applescript";

import {
  Clipboard,
  getFrontmostApplication,
  getPreferenceValues,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";

import { ModelResultHandling } from "./enums";

import { ExtensionPreferences } from "./preferences";

/**
 * Gets currently selected models in Finder.
 *
 * @returns A promise resolving to the comma-separated list of models as a string.
 */
const getSelectedFinderModels = async (): Promise<string> => {
  return runAppleScript(
    `set modelTypes to {"STEP", "Standard Tesselated Geometry File Format", "Geometry Definition File Format", "IGES", "IGS", "X3D", "X3DZ"}

    tell application "Finder"
      set theSelection to selection
      if theSelection is {} then
        return
      else if (theSelection count) is equal to 1 then
        repeat with modelType in modelTypes
          if (kind of the first item of theSelection) contains modelType then
            return the POSIX path of (theSelection as alias)
            exit repeat
          end if
        end repeat
      else
        set thePaths to {}
        repeat with i from 1 to (theSelection count)
          repeat with modelType in modelTypes
            if (kind of (item i of theSelection)) contains modelType then
              copy (POSIX path of (item i of theSelection as alias)) to end of thePaths
              exit repeat
            end if
          end repeat
        end repeat
        return thePaths
      end if
    end tell`
  );
};

/**
 * Gets currently selected models in Path Finder.
 *
 * @returns A promise resolving to the comma-separated list of models as a string.
 */
const getSelectedPathFinderModels = async (): Promise<string> => {
  return runAppleScript(
    `set modelTypes to {"STEP", "Standard Tesselated Geometry File Format", "Geometry Definition File Format", "IGES", "IGS", "X3D", "X3DZ"}

    tell application "Path Finder"
      set theSelection to selection
      if theSelection is {} then
        return
      else if (theSelection count) is equal to 1 then
        repeat with modelType in modelTypes
          if (kind of the first item of theSelection) contains modelType then
            return the POSIX path of first item of theSelection
            exit repeat
          end if
        end repeat
      else
        set thePaths to {}
        repeat with i from 1 to (theSelection count)
          repeat with modelType in modelTypes
            if (kind of (item i of theSelection)) contains modelType then
              copy (POSIX path of (item i of theSelection)) to end of thePaths
              exit repeat
            end if
          end repeat
        end repeat
        return thePaths
      end if
    end tell`
  );
};

/**
 * Cleans up temporary files created by the extension.
 *
 * @returns A promise resolving when the cleanup is complete.
 */
export const cleanup = async () => {
  const itemsToRemove = (await LocalStorage.getItem("itemsToRemove")) ?? "";
  const itemsToRemoveArray = itemsToRemove.toString().split(", ");
  for (const item of itemsToRemoveArray) {
    if (fs.existsSync(item)) {
      await fs.promises.rm(item);
    }
  }
  await LocalStorage.removeItem("itemsToRemove");
};

/**
 * Gets selected models in the preferred file manager application.
 *
 * @returns A promise resolving to the list of selected model paths.
 */
export const getSelectedModels = async (): Promise<string[]> => {
  const selectedModels: string[] = [];

  // Get name of preferred file manager
  const extensionPreferences = getPreferenceValues<ExtensionPreferences>();
  const inputMethod = extensionPreferences.inputMethod;
  let inputMethodError = false;

  // Get name of frontmost application
  let activeApp = inputMethod;
  try {
    activeApp = (await getFrontmostApplication()).name;
  } catch {
    console.error("Couldn't get frontmost application");
  }

  // Attempt to get selected models from Path Finder
  try {
    if (activeApp == "Path Finder" && inputMethod == "Path Finder") {
      const pathFinderModels = (await getSelectedPathFinderModels()).split(", ");
      pathFinderModels.forEach((imgPath) => {
        if (!selectedModels.includes(imgPath)) {
          selectedModels.push(imgPath);
        }
      });
      return selectedModels;
    }
  } catch (error) {
    // Error getting models from Path Finder, fall back to Finder
    console.error("Couldn't get models from Path Finder");
    inputMethodError = true;
  }

  // Get selected models from Finder -- use as fallback for desktop selections & on error
  const finderModels = (await getSelectedFinderModels()).split(", ");
  if (activeApp == "Finder" || inputMethod == "Finder" || inputMethodError) {
    selectedModels.push(...finderModels);
  } else {
    // Add desktop selections
    finderModels.forEach((imgPath) => {
      if (imgPath.split("/").at(-2) == "Desktop" && !selectedModels.includes(imgPath)) {
        selectedModels.push(imgPath);
      }
    });
  }

  return selectedModels;
};

/**
 * Shows or updates a toast to display the given error, and logs the error to the console.
 *
 * @param title The title of the toast.
 * @param error The error to show.
 * @param toast The toast to update.
 */
export const showErrorToast = async (title: string, error: Error, toast?: Toast) => {
  console.error(error);
  if (!toast) {
    toast = await showToast({
      title: title,
      message: error.message,
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Copy Error",
        onAction: async () => {
          await Clipboard.copy(error.message);
        },
      },
    });
  } else {
    toast.title = title;
    toast.message = error.message;
    toast.style = Toast.Style.Failure;
    toast.primaryAction = {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(error.message);
      },
    };
  }
};
