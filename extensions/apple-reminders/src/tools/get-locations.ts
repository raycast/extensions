import { LocalStorage } from "@raycast/api";

export default async function () {
  const locations = await LocalStorage.getItem("saved-locations");
  return locations;
}
