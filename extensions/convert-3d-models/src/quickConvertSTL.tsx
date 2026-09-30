/**
 * @file quickConverSTL.tsx
 *
 * @summary Raycast command to quickly convert selected models to STLs
 * @author Felix Jen <felix@fjlaboratories.com>
 *
 * Created at     : 2024-01-17 17:00:00
 * Last modified  : 2024-01-17 17:00:00
 */

import { showToast, Toast } from "@raycast/api";

import convert from "./operations/convertOperation";
import { cleanup, getSelectedModels, showErrorToast } from "./utilities/utils";
import { checkFreeCADInstallation } from "./utilities/checkinstall";

const quickConvertFormat = "STL"; // Change to the target format you want to convert to
/**
 * Executes the Command function.
 * This function checks the FreeCAD installation, gets the preference values,
 * filters the enabled formats, and performs the conversion based on the desired type.
 * It also handles error and cleanup operations.
 * @returns A JSX element representing a list of enabled formats with conversion actions.
 */
export default async function Command() {
  checkFreeCADInstallation(); // Check FreeCAD installation

  // Get preference values for ConvertPreferences and ExtensionPreferences
  //const preferences = getPreferenceValues<ConvertPreferences & ExtensionPreferences>();

  /**
   * Performs the conversion to the desired type.
   * It retrieves the selected models, checks if any models are selected,
   * shows a toast notification, performs the conversion,
   * updates the toast notification with the conversion result,
   * handles errors, and performs cleanup operations.
   * @param desiredType - The desired type to convert the models to.
   */
  // Get the selected models
  const selectedModels = await getSelectedModels();

  // Check if any models are selected
  if (selectedModels.length === 0 || (selectedModels.length === 1 && selectedModels[0] === "")) {
    await showToast({ title: "No models selected", style: Toast.Style.Failure });
    return;
  }

  // Show a toast notification for the conversion in progress
  const toast = await showToast({ title: "Conversion in progress...", style: Toast.Style.Animated });

  // Define the pluralized form of "model"
  const pluralized = `model${selectedModels.length === 1 ? "" : "s"}`;

  try {
    // Perform the conversion
    await convert(selectedModels, quickConvertFormat);

    // Update the toast notification with the conversion result
    toast.title = `Converted ${selectedModels.length} ${pluralized} to ${quickConvertFormat}`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    // Handle conversion error and show an error toast
    await showErrorToast(
      `Failed to convert ${selectedModels.length} ${pluralized} to ${quickConvertFormat}`,
      error as Error,
      toast,
    );
  } finally {
    // Perform cleanup operations
    await cleanup();
  }
}
