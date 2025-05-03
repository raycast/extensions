/**
 * @file convert.tsx
 *
 * @summary Raycast command to convert selected models between various formats.
 * @author Felix Jen <felix@fjlaboratories.com>
 *
 * Created at     : 2024-01-12 17:00:00
 * Last modified  : 2024-01-12 17:00:00
 */

import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";

import convert from "./operations/convertOperation";
import { cleanup, getSelectedModels, showErrorToast } from "./utilities/utils";
import { ConvertPreferences } from "./utilities/preferences";
import { checkFreeCADInstallation } from "./utilities/checkinstall";

/**
 * All supported model formats for conversion.
 */
const FORMATS = ["3MF", "AMF", "BRP", "DAE", "IGS", "IV", "OBJ", "OFF", "PLY", "SMF", "STL", "STEP", "X3D", "X3DZ"];

/**
 * Executes the Command function.
 * This function checks the FreeCAD installation, gets the preference values,
 * filters the enabled formats, and performs the conversion based on the desired type.
 * It also handles error and cleanup operations.
 * @returns A JSX element representing a list of enabled formats with conversion actions.
 */
export default function Command() {
  checkFreeCADInstallation(); // Check FreeCAD installation

  // Get preference values for ConvertPreferences and ExtensionPreferences
  const preferences = getPreferenceValues<ConvertPreferences & ExtensionPreferences>();

  // Filter the enabled formats based on the preferences
  const enabledFormats = FORMATS.filter((format) => preferences[`show${format}`]);

  /**
   * Performs the conversion to the desired type.
   * It retrieves the selected models, checks if any models are selected,
   * shows a toast notification, performs the conversion,
   * updates the toast notification with the conversion result,
   * handles errors, and performs cleanup operations.
   * @param desiredType - The desired type to convert the models to.
   */
  const performConversion = async (desiredType: string) => {
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
      await convert(selectedModels, desiredType);

      // Update the toast notification with the conversion result
      toast.title = `Converted ${selectedModels.length} ${pluralized} to ${desiredType}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      // Handle conversion error and show an error toast
      await showErrorToast(
        `Failed to convert ${selectedModels.length} ${pluralized} to ${desiredType}`,
        error as Error,
        toast,
      );
    } finally {
      // Perform cleanup operations
      await cleanup();
    }
  };

  return (
    // JSX element representing a list with search functionality
    <List searchBarPlaceholder="Search model formats...">
      {/* JSX element representing an empty view when no formats are enabled */}
      <List.EmptyView
        title="No Formats Enabled"
        description="Enable formats in the command preferences (⌘⇧,)"
        icon={Icon.Document}
        actions={
          // JSX element representing a panel of actions
          <ActionPanel>
            {/* JSX element representing an action to open command preferences */}
            <Action
              title="Open Command Preferences"
              onAction={async () => await openCommandPreferences()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel>
        }
      />
      {/* JSX elements representing the list items for each enabled format */}
      {enabledFormats.map((format) => (
        <List.Item
          title={format}
          key={format}
          actions={
            // JSX element representing a panel of actions
            <ActionPanel>
              {/* JSX element representing an action to perform conversion */}
              <Action title={`Convert to ${format}`} onAction={async () => await performConversion(format)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
