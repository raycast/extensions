/**
 * @file convert.tsx
 *
 * @summary Raycast command to convert selected images between various formats.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:53:25
 * Last modified  : 2024-06-26 21:37:46
 */

import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  openCommandPreferences,
} from "@raycast/api";

import convert from "./operations/convertOperation";
import { getSelectedImages } from "./utilities/utils";
import { ConvertPreferences, ExtensionPreferences } from "./utilities/preferences";
import runOperation from "./operations/runOperation";
import { useEffect } from "react";
import SettingsActionPanelSection from "./components/SettingsActionPanelSection";

/**
 * All supported image formats for conversion.
 */
const FORMATS = [
  "ASTC",
  "AVIF",
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

export default function Command(props: LaunchProps) {
  const preferences = getPreferenceValues<ConvertPreferences & ExtensionPreferences>();
  const enabledFormats = FORMATS.filter((format) => preferences[`show${format}`]);

  useEffect(() => {
    if (props.launchContext && "convertTo" in props.launchContext) {
      const { convertTo } = props.launchContext;
      if (convertTo) {
        Promise.resolve(getSelectedImages()).then(async (selectedImages) => {
          await runOperation({
            operation: () => convert(selectedImages, convertTo),
            selectedImages,
            inProgressMessage: "Conversion in progress...",
            successMessage: "Converted",
            failureMessage: "Failed to convert",
          });
        });
      }
    }
  }, [props.launchContext]);

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
                <Action
                  title={`Convert to ${format}`}
                  icon={Icon.Switch}
                  onAction={async () => {
                    const selectedImages = await getSelectedImages();
                    await runOperation({
                      operation: () => convert(selectedImages, format),
                      selectedImages,
                      inProgressMessage: "Conversion in progress...",
                      successMessage: "Converted",
                      failureMessage: "Failed to convert",
                    });
                  }}
                />
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  quicklink={{
                    name: `Convert to ${format}`,
                    link: `raycast://extensions/HelloImSteven/sips/convert?context=${encodeURIComponent(JSON.stringify({ convertTo: format }))}`,
                  }}
                />
                <SettingsActionPanelSection />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
