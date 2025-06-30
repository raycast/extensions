/**
 * @file components/ImageGeneratorActionPanel.tsx
 *
 * @summary Action panel for image generator grid items.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 11:45:04
 * Last modified  : 2024-06-26 21:37:46
 */

import os from "os";
import path from "path";

import { Action, ActionPanel, Icon, showInFinder, showToast, Toast } from "@raycast/api";

import { Generator } from "../utilities/types";
import { cleanup, getDestinationPaths, moveImageResultsToFinalDestination, showErrorToast } from "../utilities/utils";

import SettingsActionPanelSection from "./SettingsActionPanelSection";

/**
 * Action panel for image generators displayed in the main grid.
 *
 * @param props.generator The generator to use.
 * @param props.width The width of the generated image.
 * @param props.height The height of the generated image.
 * @param props.options The options to pass to the generator.
 * @param props.filename The filename to use for the generated image.
 * @param props.objectType The type of object being generated.
 * @param props.setColors The function to update the colors and trigger a re-render.
 * @returns The action panel for the generator.
 */
export default function ImageGeneratorActionPanel(props: {
  generator: Generator;
  width: number;
  height: number;
  preview: string;
  options: { [key: string]: unknown };
  objectType: string;
  regeneratePreviews: () => void;
}) {
  const { generator, width, height, preview, options, objectType, regeneratePreviews } = props;
  return (
    <ActionPanel>
      <Action
        title={`Create ${objectType}`}
        icon={Icon.Image}
        onAction={async () => {
          const destinations = await getDestinationPaths(
            [path.join(os.tmpdir(), `${objectType.replaceAll(" ", "_").toLowerCase()}.png`)],
            true,
          );
          const toast = await showToast({
            title: `Creating ${objectType}...`,
            style: Toast.Style.Animated,
          });
          try {
            await generator.applyMethod(destinations[0], generator.CIFilterName, width, height, options);
            await moveImageResultsToFinalDestination(destinations);
            toast.title = `Created ${objectType}`;
            toast.style = Toast.Style.Success;
            showInFinder(destinations[0]);
          } catch (error) {
            await showErrorToast(`Failed To Create ${objectType}`, error as Error, toast);
          } finally {
            cleanup();
          }
        }}
      />
      <Action
        title="Randomize Colors"
        icon={Icon.Shuffle}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={regeneratePreviews}
      />
      <Action.CreateQuicklink
        title="Create Quicklink"
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        quicklink={{
          name: `Create ${width}x${height} ${objectType} Image`,
          link: `raycast://extensions/HelloImSteven/sips/create-image?context=${encodeURIComponent(
            JSON.stringify({
              imageWidth: width,
              imageHeight: height,
              imagePattern: {
                name: objectType,
                options: options,
              },
            }),
          )}`,
        }}
      />

      <ActionPanel.Section title="Clipboard Actions">
        <Action.Paste
          title="Paste Preview in Active App"
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          content={{ html: `<img src="${preview}" />` }}
        />
        <Action.CopyToClipboard
          title="Copy Preview Image"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          content={{ html: `<img src="${preview}" />` }}
        />
        <Action.CopyToClipboard
          title="Copy Preview Data URL"
          content={preview}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        />
      </ActionPanel.Section>
      <SettingsActionPanelSection />
    </ActionPanel>
  );
}
