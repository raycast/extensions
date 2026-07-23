import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  Keyboard,
} from "@raycast/api";
import { AUTO_REGION_ENTRY, flagAsset } from "../lib/regions";
import { Region } from "../types";

interface Props {
  region: Region;
  isCurrent: boolean;
  isFavorite: boolean;
  subtitle?: string;
  onConnect: () => void;
  onToggleFavorite: () => void;
}

function icon(region: Region): Image.ImageLike {
  if (region.id === AUTO_REGION_ENTRY.id) {
    return { source: Icon.Bolt, tintColor: Color.Green };
  }
  return region.countryCode
    ? { source: flagAsset(region.countryCode) }
    : Icon.Globe;
}

export function RegionListItem({
  region,
  isCurrent,
  isFavorite,
  subtitle,
  onConnect,
  onToggleFavorite,
}: Props) {
  // Many regions are just the country ("France", "Albania"), where showing the
  // country as a subtitle would repeat the title. Only add it when it says
  // something new — "ES Madrid" is worth pairing with "Spain".
  const countrySubtitle =
    region.name.toLowerCase() === region.country.toLowerCase()
      ? undefined
      : region.country;

  const accessories: List.Item.Accessory[] = [];

  if (isCurrent) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: "Current region",
    });
  }
  if (isFavorite) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Favorite",
    });
  }
  if (region.portForward) {
    accessories.push({
      tag: { value: "Port FW", color: Color.Blue },
      tooltip: "Supports port forwarding",
    });
  }
  if (region.geo) {
    accessories.push({
      tag: { value: "Geo", color: Color.SecondaryText },
      tooltip: "Geo-located: IP registered here, server hosted elsewhere",
    });
  }
  if (region.offline) {
    accessories.push({ tag: { value: "Offline", color: Color.Red } });
  }

  return (
    <List.Item
      icon={icon(region)}
      title={region.name}
      subtitle={subtitle ?? countrySubtitle}
      keywords={[region.id, region.country, region.countryCode]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Connect" icon={Icon.Bolt} onAction={onConnect} />
          <Action
            title={isFavorite ? "Remove Favorite" : "Add Favorite"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={onToggleFavorite}
          />
          <Action.CopyToClipboard
            title="Copy Region ID"
            content={region.id}
            shortcut={Keyboard.Shortcut.Common.Pin}
          />
        </ActionPanel>
      }
    />
  );
}
