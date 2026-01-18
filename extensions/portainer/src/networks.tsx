import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useNetworks, portainerApi } from "./hooks/usePortainer";
import { Network } from "./api/types";
import { NETWORK_DRIVER_ICONS, DEFAULT_ICONS } from "./utils/constants";
import {
  formatDateToRelative,
  getPortainerWebUrl,
  formatShortId,
} from "./utils/helpers";

export default function NetworksCommand() {
  const { data: networks, isLoading, revalidate } = useNetworks();

  // Sort networks by name
  const sortedNetworks = networks?.sort((a, b) => a.Name.localeCompare(b.Name));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search networks...">
      {sortedNetworks?.map((network) => (
        <NetworkListItem
          key={network.Id}
          network={network}
          revalidate={revalidate}
        />
      ))}
    </List>
  );
}

function NetworkListItem({
  network,
  revalidate,
}: {
  network: Network;
  revalidate: () => void;
}) {
  const shortId = formatShortId(network.Id);

  // Get subnet info
  const subnet = network.IPAM?.Config?.[0]?.Subnet || "N/A";

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: network.Driver,
        color: getDriverColor(network.Driver),
      },
    },
    {
      tag: {
        value: network.Scope,
        color: getScopeColor(network.Scope),
      },
    },
  ];

  // Add container count if available
  if (network.Containers) {
    const containerCount = Object.keys(network.Containers).length;
    if (containerCount > 0) {
      accessories.push({
        text: `${containerCount} container${containerCount > 1 ? "s" : ""}`,
      });
    }
  }

  // Add creation date
  if (network.Created) {
    accessories.push({
      text: formatDateToRelative(network.Created),
    });
  }

  const driverIcon =
    NETWORK_DRIVER_ICONS[network.Driver] || DEFAULT_ICONS.network;

  return (
    <List.Item
      title={network.Name}
      subtitle={`${shortId} • ${subnet}`}
      icon={{ source: driverIcon, tintColor: getDriverColor(network.Driver) }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Network Id"
              content={network.Id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Network Name"
              content={network.Name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.OpenInBrowser
              title="Open in Portainer"
              url={getPortainerWebUrl(
                portainerApi.getPortainerUrl(),
                portainerApi.getEndpointIdSync(),
                "network",
                network.Id,
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

function getDriverColor(driver: string): Color {
  switch (driver) {
    case "bridge":
      return Color.Blue;
    case "host":
      return Color.Green;
    case "overlay":
      return Color.Purple;
    case "macvlan":
      return Color.Orange;
    case "none":
    case "null":
      return Color.SecondaryText;
    default:
      return Color.SecondaryText;
  }
}

function getScopeColor(scope: string): Color {
  switch (scope) {
    case "local":
      return Color.Blue;
    case "swarm":
      return Color.Purple;
    case "global":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}
