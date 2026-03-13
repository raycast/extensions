import { MenuBarExtra, Icon, open, getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { useStations, useFavorites, usePinnedStation } from "./utils/hooks";
import { getBikeIcon } from "./utils/icon";
import { Region, REGION_CONFIG } from "./utils/constants";

export default function Command() {
  const preferences = getPreferenceValues<{ region: Region }>();
  const { stations, isLoading } = useStations();
  const { favorites } = useFavorites();
  const { pinnedStationId, pinStation, unpinStation } = usePinnedStation();
  updateCommandMetadata({ subtitle: REGION_CONFIG[preferences.region].name });

  const allFavoriteStations = stations.filter((station) => favorites.includes(station.station_id));
  const pinnedStation = stations.find((station) => station.station_id === pinnedStationId);

  const favoriteStations =
    pinnedStation && favorites.includes(pinnedStation.station_id)
      ? [pinnedStation, ...allFavoriteStations.filter((s) => s.station_id !== pinnedStationId)]
      : allFavoriteStations;

  const getMenuBarTitle = () => {
    if (pinnedStation) {
      const classic = pinnedStation.num_classic_bikes_available;
      const ebike = pinnedStation.num_ebikes_available;
      return `Classic: ${classic} / eBike: ${ebike}`;
    }
    return undefined;
  };

  const getMenuBarTooltip = () => {
    if (pinnedStation) {
      return `${pinnedStation.name}: ${pinnedStation.num_classic_bikes_available} classic, ${pinnedStation.num_ebikes_available} eBikes`;
    }
    return "Favorite Bike Stations";
  };

  return (
    <MenuBarExtra
      icon={pinnedStation ? undefined : Icon.Bike}
      title={getMenuBarTitle()}
      tooltip={getMenuBarTooltip()}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Favorite Stations">
        {favoriteStations.length === 0 ? (
          <MenuBarExtra.Item title="No favorites yet" />
        ) : (
          favoriteStations.map((station) => {
            const totalBikes = station.num_classic_bikes_available + station.num_ebikes_available;
            const bikeStatus = getBikeIcon(totalBikes);
            const isPinned = station.station_id === pinnedStationId;
            return (
              <MenuBarExtra.Submenu
                key={station.station_id}
                title={`${station.name} (${station.num_classic_bikes_available} + ${station.num_ebikes_available})`}
                icon={isPinned ? Icon.ChevronUp : { source: bikeStatus.icon, tintColor: bikeStatus.color }}
              >
                <MenuBarExtra.Item title={`Classic: ${station.num_classic_bikes_available}`} icon={Icon.BoltDisabled} />
                <MenuBarExtra.Item title={`eBikes: ${station.num_ebikes_available}`} icon={Icon.Bolt} />
                <MenuBarExtra.Item title={`Docks: ${station.num_docks_available}`} icon={Icon.ArrowDownCircle} />

                {station.lat && station.lon && (
                  <MenuBarExtra.Item
                    title="Open in Google Maps"
                    icon={Icon.Map}
                    onAction={() => open(`https://maps.google.com/?q=${station.lat},${station.lon}`)}
                  />
                )}
                {isPinned ? (
                  <MenuBarExtra.Item
                    title="Unpin from Menu Bar"
                    icon={Icon.XMarkTopRightSquare}
                    onAction={unpinStation}
                  />
                ) : (
                  <MenuBarExtra.Item
                    title="Pin to Menu Bar"
                    icon={Icon.PlusTopRightSquare}
                    onAction={() => pinStation(station.station_id)}
                  />
                )}
              </MenuBarExtra.Submenu>
            );
          })
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
