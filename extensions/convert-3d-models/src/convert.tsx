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
import { ConvertPreferences, ExtensionPreferences } from "./utilities/preferences";

/**
 * All supported model formats for conversion.
 */
const FORMATS = [
  "STEP",
  "STL", 
  "OBJ", 
  "3MF", 
  "IGS", 
  "X3D", 
  "X3DZ"
];

export default function Command() {
  const preferences = getPreferenceValues<ConvertPreferences & ExtensionPreferences>();
  const enabledFormats = FORMATS.filter((format) => preferences[`show${format}`]);

  const performConversion = async (desiredType: string) => {
    const selectedModels = await getSelectedModels();
    if (selectedModels.length === 0 || (selectedModels.length === 1 && selectedModels[0] === "")) {
      await showToast({ title: "No models selected", style: Toast.Style.Failure });
      return;
    }

    const toast = await showToast({ title: "Conversion in progress...", style: Toast.Style.Animated });
    const pluralized = `model${selectedModels.length === 1 ? "" : "s"}`;
    try {
      await convert(selectedModels, desiredType);
      toast.title = `Converted ${selectedModels.length.toString()} ${pluralized} to ${desiredType}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      await showErrorToast(
        `Failed to convert ${selectedModels.length.toString()} ${pluralized} to ${desiredType}`,
        error as Error,
        toast
      );
    } finally {
      await cleanup();
    }
  };

  return (
    <List searchBarPlaceholder="Search model conversions...">
      <List.EmptyView
        title="No Formats Enabled"
        description="Enable formats in the command preferences (⌘⇧,)"
        icon={Icon.Model}
        actions={
          <ActionPanel>
            <Action
              title="Open Command Preferences"
              onAction={async () => await openCommandPreferences()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel>
        }
      />
      {enabledFormats.map((format) => {
        return (
          <List.Item
            title={format}
            key={format}
            actions={
              <ActionPanel>
                <Action title={`Convert to ${format}`} onAction={async () => await performConversion(format)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
