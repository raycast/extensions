import { crossLaunchCommand } from "raycast-cross-extension";
import { Action, Icon, LaunchType, open } from "@raycast/api";

interface WaybackMachineActionsProps {
  url: string;
  archiveUrl?: string;
}

export function WaybackMachineActions({ url, archiveUrl }: WaybackMachineActionsProps) {
  const handleOpenInWayback = async () => {
    try {
      await crossLaunchCommand({
        name: "open",
        type: LaunchType.UserInitiated,
        extensionName: "wayback-machine",
        ownerOrAuthorName: "pernielsentikaer",
        arguments: {
          url: url,
        },
      });
    } catch {
      // Extension not installed, open store page
      await open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/pernielsentikaer/wayback-machine`);
    }
  };

  const handleSaveToWayback = async () => {
    try {
      await crossLaunchCommand({
        name: "save",
        type: LaunchType.UserInitiated,
        extensionName: "wayback-machine",
        ownerOrAuthorName: "pernielsentikaer",
        arguments: {
          url: url,
        },
      });
    } catch {
      // Extension not installed, open store page
      await open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/pernielsentikaer/wayback-machine`);
    }
  };

  return (
    <>
      <Action
        title="Open in Wayback Machine"
        icon={Icon.Clock}
        onAction={handleOpenInWayback}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "b" },
          Windows: { modifiers: ["ctrl", "shift"], key: "b" },
        }}
      />
      <Action
        title="Save to Wayback Machine"
        icon={Icon.SaveDocument}
        onAction={handleSaveToWayback}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "y" },
          Windows: { modifiers: ["ctrl", "shift"], key: "y" },
        }}
      />
      {archiveUrl && (
        <Action.OpenInBrowser
          title="Browse Archive History"
          url={archiveUrl}
          icon={Icon.List}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "h" },
            Windows: { modifiers: ["ctrl", "shift"], key: "h" },
          }}
        />
      )}
    </>
  );
}
