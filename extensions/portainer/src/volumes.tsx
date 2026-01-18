import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useVolumes, portainerApi } from "./hooks/usePortainer";
import { Volume } from "./api/types";
import { VOLUME_DRIVER_ICONS, DEFAULT_ICONS } from "./utils/constants";
import {
  formatBytes,
  formatDateToRelative,
  getPortainerWebUrl,
} from "./utils/helpers";

export default function VolumesCommand() {
  const { data: volumes, isLoading, revalidate } = useVolumes();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search volumes...">
      {volumes?.map((volume) => (
        <VolumeListItem
          key={volume.Name}
          volume={volume}
          revalidate={revalidate}
        />
      ))}
    </List>
  );
}

function VolumeListItem({
  volume,
  revalidate,
}: {
  volume: Volume;
  revalidate: () => void;
}) {
  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: volume.Driver,
        color: Color.SecondaryText,
      },
    },
    {
      tag: {
        value: volume.Scope,
        color: volume.Scope === "local" ? Color.Blue : Color.Purple,
      },
    },
  ];

  // Add size if available
  if (volume.UsageData?.Size) {
    accessories.push({
      text: formatBytes(volume.UsageData.Size),
    });
  }

  // Add creation date if available
  if (volume.CreatedAt) {
    accessories.push({
      text: formatDateToRelative(volume.CreatedAt),
    });
  }

  const driverIcon = VOLUME_DRIVER_ICONS[volume.Driver] || DEFAULT_ICONS.volume;

  return (
    <List.Item
      title={volume.Name}
      subtitle={volume.Mountpoint}
      icon={{ source: driverIcon, tintColor: Color.Orange }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Volume Name"
              content={volume.Name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Mount Point"
              content={volume.Mountpoint}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.OpenInBrowser
              title="Open in Portainer"
              url={getPortainerWebUrl(
                portainerApi.getPortainerUrl(),
                portainerApi.getEndpointIdSync(),
                "volume",
                volume.Name,
              )}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
