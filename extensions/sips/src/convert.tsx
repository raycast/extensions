/**
 * @file convert.tsx
 *
 * @summary Raycast command to convert selected images between various formats.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:53:25
 * Last modified  : 2023-07-06 15:47:53
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
import { cleanup, getSelectedImages, showErrorToast } from "./utilities/utils";
import { ConvertPreferences, ExtensionPreferences } from "./utilities/preferences";

/**
 * All supported image formats for conversion.
 */
const FORMATS = [
  "ASTC",
  "BMP",
  "DDS",
  "EXR",
  "GIF",
  "HEIC",
  "HEICS",
  "ICNS",
  "ICO",
  "JPEG",
  "JP2",
  "KTX",
  "PBM",
  "PDF",
  "PNG",
  "PSD",
  "PVR",
  "TGA",
  "TIFF",
  "WEBP",
  "SVG",
];

export default function Command() {
  const preferences = getPreferenceValues<ConvertPreferences & ExtensionPreferences>();
  const enabledFormats = FORMATS.filter((format) => preferences[`show${format}`]);

  const performConversion = async (desiredType: string) => {
    const selectedImages = await getSelectedImages();
    if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
      await showToast({ title: "No images selected", style: Toast.Style.Failure });
      return;
    }

    const toast = await showToast({ title: "Conversion in progress...", style: Toast.Style.Animated });
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      await convert(selectedImages, desiredType);
      toast.title = `Converted ${selectedImages.length.toString()} ${pluralized} to ${desiredType}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      await showErrorToast(
        `Failed to convert ${selectedImages.length.toString()} ${pluralized} to ${desiredType}`,
        error as Error,
        toast
      );
    } finally {
      await cleanup();
    }
  };

  return (
    <List searchBarPlaceholder="Search image transformations...">
      <List.EmptyView
        title="No Formats Enabled"
        description="Enable formats in the command preferences (⌘⇧,)"
        icon={Icon.Image}
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
