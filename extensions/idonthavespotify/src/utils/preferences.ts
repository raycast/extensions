import { getPreferenceValues } from "@raycast/api";
import { Adapter } from "../@types/global";

interface Preferences {
  defaultAdapter?: Adapter | "all";
}

export const getAdapters = () => {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.defaultAdapter || preferences.defaultAdapter === "all") {
    return Object.values(Adapter).filter((adapter) => adapter !== Adapter.Spotify);
  }

  return [preferences.defaultAdapter];
};
