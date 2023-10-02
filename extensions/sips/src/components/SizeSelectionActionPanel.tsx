/**
 * @file components/SizeSelectionActionPanel.tsx
 *
 * @summary Action panel for image size selection grid items.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 16:46:33
 * Last modified  : 2023-07-06 16:46:49
 */

import os from "os";
import path from "path";

import { Action, ActionPanel, Clipboard, Icon, showHUD, showToast, Toast } from "@raycast/api";

import { generatePlaceholder } from "../utilities/generators";
import { cleanup, getDestinationPaths, moveImageResultsToFinalDestination, showErrorToast } from "../utilities/utils";
import ImagePatternGrid from "./ImagePatternGrid";

/**
 * Action panel for the image size selection grid.
 *
 * @param props.width The width of the generated image.
 * @param props.height The height of the generated image.
 * @returns An action panel component.
 */
export default function SizeSelectionActionPanel(props: { width: number; height: number }) {
  const { width, height } = props;
  return (
    <ActionPanel>
      <Action.Push
        title={`Select Size ${width}x${height}`}
        icon={Icon.Center}
        target={<ImagePatternGrid width={width} height={height} />}
      />
      <Action
        title={`Create ${width}x${height} Placeholder`}
        icon={Icon.Image}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        onAction={async () => {
          const destinations = getDestinationPaths([path.join(os.tmpdir(), `${width}x${height}.png`)], true);
          const toast = await showToast({ title: "Creating Placeholder...", style: Toast.Style.Animated });
          try {
            await generatePlaceholder(width, height, destinations[0]);
            await moveImageResultsToFinalDestination(destinations);
            toast.title = `Created Placeholder`;
            toast.style = Toast.Style.Success;
          } catch (error) {
            await showErrorToast(`Failed To Create Placeholder`, error as Error, toast);
          } finally {
            cleanup();
          }
        }}
      />
      <ActionPanel.Section title="Clipboard Actions">
        <Action
          title="Paste Placeholder In Active App"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onAction={async () => {
            const dataURL = await generatePlaceholder(width, height);
            await Clipboard.paste({ html: `<img src="${dataURL}" />` });
            await showHUD("Pasted Placeholder Image");
          }}
        />
        <Action
          title="Copy Placeholder Image"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => {
            const dataURL = await generatePlaceholder(width, height);
            await Clipboard.copy({ html: `<img src="${dataURL}" />` });
            await showHUD("Copied Placeholder Image");
          }}
        />
        <Action
          title="Copy Placeholder Data URL"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          onAction={async () => {
            const dataURL = await generatePlaceholder(width, height);
            await Clipboard.copy(dataURL);
            await showHUD("Copied Placeholder Data URL");
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
