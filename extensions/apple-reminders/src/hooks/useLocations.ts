import { useLocalStorage } from "../hooks/useLocalStorage";

export type Location = {
  id: string;
  name: string;
  icon: string;
  address: string;
  proximity: string;
  radius: string;
};

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
