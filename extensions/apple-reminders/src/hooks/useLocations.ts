import { Icon } from "@raycast/api";

import { useLocalStorage } from "../hooks/useLocalStorage";

export type LocationIcon = "home" | "work" | "gym" | "store" | "school" | "other";

export type Location = {
  id: string;
  name: string;
  icon: LocationIcon | string;
  address: string;
  proximity: string;
  radius: string;
};

export function resolveLocationIcon(icon: LocationIcon | string) {
  switch (icon) {
    case "home":
      return Icon.House;
    case "work":
      return Icon.AppWindowGrid3x3;
    case "gym":
      return Icon.Person;
    case "store":
      return Icon.Tray;
    case "school":
      return Icon.Star;
    case "other":
      return Icon.Pin;
    default:
      return Icon.Pin;
  }
}

export default function useLocations() {
  const { value, setValue } = useLocalStorage<Location[]>("saved-locations", []);

  async function addLocation(location: Location) {
    return setValue([...value, location]);
  }

  async function editLocation(location: Location) {
    return setValue(value.map((l) => (l.id === location.id ? location : l)));
  }

  async function deleteLocation(locationId: string) {
    return setValue(value.filter((l) => l.id !== locationId));
  }

  return { locations: value, addLocation, editLocation, deleteLocation };
}
