import { Action, Icon, open, LaunchType } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

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
      await open("raycast://extensions/pernielsentikaer/wayback-machine");
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
      await open("raycast://extensions/pernielsentikaer/wayback-machine");
    }
  };

  return (
    <>
      <Action
        title="Open in Wayback Machine"
        icon={Icon.Clock}
        onAction={handleOpenInWayback}
        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
      />
      <Action
        title="Save to Wayback Machine"
        icon={Icon.SaveDocument}
        onAction={handleSaveToWayback}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      {archiveUrl && (
        <Action.OpenInBrowser
          title="Browse Archive History"
          url={archiveUrl}
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        />
      )}
    </>
  );
}
