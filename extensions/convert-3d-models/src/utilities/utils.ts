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

import { runAppleScript } from "@raycast/utils";

import { Clipboard, getFrontmostApplication, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";

/**
 * Gets currently selected models in Finder.
 *
 * @returns A promise resolving to the comma-separated list of models as a string.
 */
const getSelectedFinderModels = async (): Promise<string> => {
  return runAppleScript(
    `set modelTypes to {"step", "stp", "stl", "obj", "iges", "igs", "x3d", "x3dz", "3mf", "brep", "brp", "smf", "ply", "iv"}

    tell application "Finder"
      set theSelection to selection
      if theSelection is {} then
        return
      else if (theSelection count) is equal to 1 then
        repeat with modelType in modelTypes
          if (name extension of the first item of theSelection) contains modelType then
            return the POSIX path of (theSelection as alias)
            exit repeat
          end if
        end repeat
      else
        set thePaths to {}
        repeat with i from 1 to (theSelection count)
          repeat with modelType in modelTypes
            if (name extension of (item i of theSelection)) contains modelType then
              copy (POSIX path of (item i of theSelection as alias)) to end of thePaths
              exit repeat
            end if
          end repeat
        end repeat
        return thePaths
      end if
    end tell`,
  );
};

/**
 * Gets currently selected models in Path Finder.
 *
 * @returns A promise resolving to the comma-separated list of models as a string.
 */
const getSelectedPathFinderModels = async (): Promise<string> => {
  return runAppleScript(
    `set modelTypes to {"step", "stp", "stl", "obj", "iges", "igs", "x3d", "x3dz", "3mf", "brep", "brp", "smf", "ply", "iv"}

    tell application "Path Finder"
      set theSelection to selection
      if theSelection is {} then
        return
      else if (theSelection count) is equal to 1 then
        repeat with modelType in modelTypes
          if (name extension of the first item of theSelection) contains modelType then
            return the POSIX path of first item of theSelection
            exit repeat
          end if
        end repeat
      else
        set thePaths to {}
        repeat with i from 1 to (theSelection count)
          repeat with modelType in modelTypes
            if (name extension of (item i of theSelection)) contains modelType then
              copy (POSIX path of (item i of theSelection)) to end of thePaths
              exit repeat
            end if
          end repeat
        end repeat
        return thePaths
      end if
    end tell`,
  );
};

/**
 * Cleans up temporary files created by the extension.
 *
 * @returns {Promise<void>} A promise resolving when the cleanup is complete.
 */
export const cleanup = async () => {
  // Get the list of items to remove from local storage
  const itemsToRemove = (await LocalStorage.getItem("itemsToRemove")) ?? "";

  // Split the list into an array of items
  const itemsToRemoveArray = itemsToRemove.toString().split(", ");

  // Iterate over each item and remove it if it exists
  for (const item of itemsToRemoveArray) {
    if (fs.existsSync(item)) {
      await fs.promises.rm(item);
    }
  }

  // Remove the list of items from local storage
  await LocalStorage.removeItem("itemsToRemove");
};

/**
 * Gets selected models in the preferred file manager application.
 *
 * @returns A promise resolving to the list of selected model paths.
 */
export const getSelectedModels = async (): Promise<string[]> => {
  // Initialize an empty array to store the selected model paths
  const selectedModels: string[] = [];

  // Get the preferences from the extension
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const inputMethod = preferences.inputMethod.toString();

  // Get the name of the frontmost application
  let activeApp = inputMethod;
  try {
    activeApp = (await getFrontmostApplication()).name;
  } catch {
    console.error("Couldn't get frontmost application");
  }

  // Check the active application and retrieve the selected models accordingly
  switch (activeApp) {
    case "Path Finder":
      // If the active application is Path Finder and the input method is also Path Finder,
      // retrieve the selected models using the appropriate function and add them to the selectedModels array
      if (inputMethod === "Path Finder") {
        const pathFinderModels = (await getSelectedPathFinderModels()).split(", ");
        selectedModels.push(...pathFinderModels);
      }
      break;
    case "Finder": {
      // If the active application is Finder,
      // retrieve the selected models using the appropriate function and add them to the selectedModels array
      const finderModels = (await getSelectedFinderModels()).split(", ");
      selectedModels.push(...finderModels);

      // If the input method is not Finder,
      // check if the model path belongs to the Desktop directory and add it to the selectedModels array if it's not already included
      if (inputMethod !== "Finder") {
        finderModels.forEach((modelPath) => {
          if (modelPath.split("/").at(-2) === "Desktop" && !selectedModels.includes(modelPath)) {
            selectedModels.push(modelPath);
          }
        });
      }
      break;
    }
  }

  // Return the list of selected model paths
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
