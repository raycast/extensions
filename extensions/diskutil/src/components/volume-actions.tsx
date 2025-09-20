import { Action, ActionPanel, Icon } from "@raycast/api";
import { VolumeInfo } from "@components/volumes";

export const VolumeActions = ({ volume }: { volume?: VolumeInfo }) => {
  return (
    volume && (
      <>
        <Action.ShowInFinder path={volume.MountPoint!} />
        <ActionPanel.Section>
          <Action.CreateQuicklink
            title="Create Quicklink"
            icon={Icon.RaycastLogoPos}
            quicklink={{
              link: `file://${volume.MountPoint}`,
              name: `Volume ${volume.VolumeName}`,
              application: "Finder",
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
          />
          <Action.CopyToClipboard
            title="Copy Device Node"
            content={volume.DeviceNode ?? ""}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
          <Action.CopyToClipboard
            title="Copy Mount Point"
            content={volume.MountPoint!}
            shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
          />
        </ActionPanel.Section>
      </>
    )
  );
};
