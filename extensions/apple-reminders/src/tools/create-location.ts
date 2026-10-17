import { LocalStorage } from "@raycast/api";

type Input = {
  /**
   * Unique identifier for the location.
   */
  id: string;
  /**
   * Display name for the saved location.
   */
  name: string;
  /**
   * Icon to represent the location. Only pick the value from this list: "home", "work", "gym", "store", "school", "other".
   */
  icon: "home" | "work" | "gym" | "store" | "school" | "other";
  /**
   * The physical address of the location.
   */
  address: string;
  /**
   * The proximity trigger type. Only pick the value from this list: "enter", "leave".
   */
  proximity: "enter" | "leave";
  /**
   * The radius around the location in meters.
   */
  radius: string;
};

export default async function (input: Input) {
  const item = await LocalStorage.getItem<string>("saved-locations");
  const locations = item ? JSON.parse(item) : [];
  const newLocations = [...locations, input];
  await LocalStorage.setItem("saved-locations", JSON.stringify(newLocations));
  return newLocations;
}
