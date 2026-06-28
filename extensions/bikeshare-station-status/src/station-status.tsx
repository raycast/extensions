import { Action, ActionPanel, List, Icon, Color, open, getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { useState } from "react";
import { type Station } from "./utils/gbfs";
import { useStations, useFavorites } from "./utils/hooks";
import { formatRelativeTime } from "./utils/date";
import { getBikeIcon } from "./utils/icon";
import { Region, REGION_CONFIG } from "./utils/constants";

export default function Command() {
  const preferences = getPreferenceValues<{ region: Region }>();
  const { stations, isLoading } = useStations();
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  updateCommandMetadata({ subtitle: REGION_CONFIG[preferences.region].name });

  const favoriteStations = stations.filter((station) => favorites.includes(station.station_id));
  const otherStations = stations.filter(
    (station) => !favorites.includes(station.station_id) && station.is_renting === 1,
  );

  const getAccessories = (station: Station) => [
    {
      text: `${station.num_classic_bikes_available}`,
      icon: { source: Icon.BoltDisabled, tintColor: Color.Blue },
      tooltip: "Classic Bikes",
    },
    {
      text: `${station.num_ebikes_available}`,
      icon: { source: Icon.Bolt, tintColor: Color.Green },
      tooltip: "eBikes",
    },
  ];

  const StationDetail = ({ station }: { station: Station }) => (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Station" text={station.name} />
          {station.address && <List.Item.Detail.Metadata.Label title="Address" text={station.address} />}
          {station.capacity && <List.Item.Detail.Metadata.Label title="Capacity" text={String(station.capacity)} />}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Classic Bikes"
            text={String(station.num_classic_bikes_available)}
            icon={{ source: Icon.BoltDisabled, tintColor: Color.Blue }}
          />
          <List.Item.Detail.Metadata.Label
            title="eBikes"
            text={String(station.num_ebikes_available)}
            icon={{ source: Icon.Bolt, tintColor: Color.Green }}
          />
          <List.Item.Detail.Metadata.Label
            title="Available Docks"
            text={String(station.num_docks_available)}
            icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Purple }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Last Reported" text={formatRelativeTime(station.last_reported)} />
          {station.is_renting === 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Status"
                text="Not Currently Renting"
                icon={{ source: Icon.Important, tintColor: Color.Red }}
              />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );

  const StationListItem = ({
    station,
    isFavorite,
    onAction,
  }: {
    station: Station;
    isFavorite: boolean;
    onAction: (id: string) => void;
  }) => {
    const totalBikes = station.num_classic_bikes_available + station.num_ebikes_available;
    const bikeStatus = getBikeIcon(totalBikes);

    return (
      <List.Item
        key={station.station_id}
        title={station.name}
        icon={{ source: bikeStatus.icon, tintColor: bikeStatus.color }}
        detail={<StationDetail station={station} />}
        accessories={!isShowingDetail ? getAccessories(station) : []}
        actions={
          <ActionPanel>
            <Action
              title={`${isShowingDetail ? "Hide" : "Show"} Details`}
              onAction={() => setIsShowingDetail(!isShowingDetail)}
            />
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={() => onAction(station.station_id)}
            />
            {station.lat && station.lon && (
              <Action
                title="Open in Google Maps"
                icon={Icon.Map}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "o" },
                  Windows: { modifiers: ["ctrl"], key: "o" },
                }}
                onAction={() => open(`https://google.com/maps?q=${station.lat},${station.lon}`)}
              />
            )}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search stations...">
      <List.Section title="Favorite Stations">
        {favoriteStations.map((station) => (
          <StationListItem key={station.station_id} station={station} isFavorite={true} onAction={removeFavorite} />
        ))}
      </List.Section>
      <List.Section title="Other Stations">
        {otherStations.map((station) => (
          <StationListItem key={station.station_id} station={station} isFavorite={false} onAction={addFavorite} />
        ))}
      </List.Section>
    </List>
  );
}
