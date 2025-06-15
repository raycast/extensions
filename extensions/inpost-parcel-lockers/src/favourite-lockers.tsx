import { useCachedPromise } from "@raycast/utils";
import { Location, getLocation } from "inpost";
import { getFavouriteLocationIds } from "./storage";
import { LocationList } from "./shared";

export default function Command() {
  const {
    isLoading,
    data: locations,
    revalidate: reloadLocations,
  } = useCachedPromise<() => Promise<Location[]>>(async () => {
    const favouriteLocationIds = await getFavouriteLocationIds();
    return Promise.all(Array.from(favouriteLocationIds).map(getLocation));
  });

  return <LocationList locations={locations || []} isLoading={isLoading} refreshLocations={reloadLocations} />;
}
