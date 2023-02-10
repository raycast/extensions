import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Location, LocationAvailability, LockerSize, getAvailabilityForLocation } from "inpost";
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

export const LocationItem = (props: { location: Location; refreshLocations: () => void }) => {
  const { location, refreshLocations } = props;

  const { data: locationAvailability, isLoading } = useCachedPromise<
    (locationId: string) => Promise<LocationAvailability>
  >(async (locationId: string) => getAvailabilityForLocation(locationId), [location.id]);

  return (
    <LocationItemWithLocationAvailability
      location={location}
      isLoadingAvailability={isLoading}
      locationAvailability={locationAvailability}
      refreshLocations={refreshLocations}
    />
  );
};

export const LocationItemWithLocationAvailability = (props: {
  isLoadingAvailability: boolean;
  location: Location;
  locationAvailability: LocationAvailability | undefined;
  refreshLocations: () => void;
}) => {
  const { isLoadingAvailability, location, locationAvailability, refreshLocations } = props;

  const { data: isFavourite, revalidate: reloadFavouriteStatus } = useCachedPromise<
    (locationId: string) => Promise<boolean>
  >(async (locationId: string) => isFavouriteLocationId(locationId), [location.id]);

  const lockerAvailabilityAccessories =
    !isLoadingAvailability && locationAvailability
      ? [
          { text: `S: ${locationAvailability.availabilityByLockerSize[LockerSize.SMALL].availableCount}` },
          { text: `M: ${locationAvailability.availabilityByLockerSize[LockerSize.MEDIUM].availableCount}` },
          { text: `L: ${locationAvailability.availabilityByLockerSize[LockerSize.LARGE].availableCount}` },
          { date: locationAvailability.lastUpdatedAt },
        ]
      : [{ text: "Loading..." }];

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
