import { LocalStorage } from "@raycast/api";

const COMMA_SEPARATED_FAVOURITE_LOCATION_IDS_KEY = "commaSeparatedFavouriteLocationIds";

export const getFavouriteLocationIds = async (): Promise<Set<string>> => {
  const commaSeparatedFavouriteLocationIds = await LocalStorage.getItem<string>(
    COMMA_SEPARATED_FAVOURITE_LOCATION_IDS_KEY,
  );

  if (typeof commaSeparatedFavouriteLocationIds === "undefined") {
    return new Set<string>();
  } else if (commaSeparatedFavouriteLocationIds.length === 0) {
    return new Set<string>();
  } else {
    return new Set<string>(commaSeparatedFavouriteLocationIds.split(","));
  }
};

const setFavouriteLocationIds = async (favouriteLocationIds: Set<string>): Promise<void> => {
  const favouriteLocationIdsString = Array.from(favouriteLocationIds).join(",");
  LocalStorage.setItem(COMMA_SEPARATED_FAVOURITE_LOCATION_IDS_KEY, favouriteLocationIdsString);
};

export const addFavouriteLocationId = async (locationId: string): Promise<void> => {
  const favouriteLocationIds = await getFavouriteLocationIds();
  return setFavouriteLocationIds(favouriteLocationIds.add(locationId));
};

export const removeFavouriteLocationId = async (locationId: string): Promise<void> => {
  const favouriteLocationIds = await getFavouriteLocationIds();
  favouriteLocationIds.delete(locationId);
  return setFavouriteLocationIds(favouriteLocationIds);
};

export const isFavouriteLocationId = async (locationId: string): Promise<boolean> => {
  const favouriteLocationIds = await getFavouriteLocationIds();
  return favouriteLocationIds.has(locationId);
};
