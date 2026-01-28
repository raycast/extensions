import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Location, LockerAvailabilityLevel } from "inpost";
import { addFavouriteLocationId, isFavouriteLocationId, removeFavouriteLocationId } from "./storage";

export const LocationList = (props: { isLoading: boolean; locations: Location[]; refreshLocations: () => void }) => {
  const { locations, isLoading, refreshLocations } = props;

  return (
    <List isLoading={isLoading}>
      <List.Section title="Locations" subtitle={locations && locations.length + ""}>
        {locations &&
          locations.map((location) => (
            <LocationItem key={location.id} location={location} refreshLocations={refreshLocations} />
          ))}
      </List.Section>
    </List>
  );
};

const presentLockerAvailability = (lockerAvailability: LockerAvailabilityLevel): string => {
  switch (lockerAvailability) {
    case LockerAvailabilityLevel.VERY_LOW:
      return "Very Low";
    case LockerAvailabilityLevel.LOW:
      return "Low";
    case LockerAvailabilityLevel.NORMAL:
      return "Normal";
    default:
      return "-";
  }
};

export const LocationItem = (props: { location: Location; refreshLocations: () => void }) => {
  const { location, refreshLocations } = props;

  const { data: isFavourite, revalidate: reloadFavouriteStatus } = useCachedPromise<
    (locationId: string) => Promise<boolean>
  >(async (locationId: string) => isFavouriteLocationId(locationId), [location.id]);

  const lockerAvailabilityAccessories = [
    { text: `S: ${presentLockerAvailability(location.smallLockerAvailability)}` },
    { text: `M: ${presentLockerAvailability(location.mediumLockerAvailability)}` },
    { text: `L: ${presentLockerAvailability(location.largeLockerAvailability)}` },
  ];

  const favouriteAccessories = isFavourite ? [{ icon: Icon.Star }] : [];

  return (
    <List.Item
      title={location.name}
      accessories={[...favouriteAccessories, ...lockerAvailabilityAccessories]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Google Maps"
            icon={Icon.Globe}
            url={"http://maps.google.com/maps?q=" + location.latitude + "," + location.longitude}
          />

          {isFavourite && (
            <Action
              title="Remove from Favourites"
              icon={Icon.StarDisabled}
              shortcut={{ modifiers: ["opt"], key: "f" }}
              onAction={async () => {
                await removeFavouriteLocationId(location.id);
                reloadFavouriteStatus();
                if (refreshLocations) {
                  refreshLocations();
                }
              }}
            />
          )}

          {!isFavourite && (
            <Action
              title="Add to Favourites"
              icon={Icon.Star}
              shortcut={{ modifiers: ["opt"], key: "f" }}
              onAction={async () => {
                await addFavouriteLocationId(location.id);
                reloadFavouriteStatus();
                if (refreshLocations) {
                  refreshLocations();
                }
              }}
            />
          )}

          <Action
            title="Refresh Lockers"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["opt"], key: "r" }}
            onAction={refreshLocations}
          />
        </ActionPanel>
      }
    />
  );
};
