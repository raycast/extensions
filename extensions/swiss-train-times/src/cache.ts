import { LocalStorage } from "@raycast/api";
import { PlaceResult } from "ojp-sdk-next";

const KEY = "searched-stations";
const capacity = 7;

export async function addPlaceStop(place: PlaceResult) {
  const stops = await getPlaceStops();
  const ref = place.place.stopPlace?.stopPlaceRef;

  const index = stops.findIndex((s) => s.place.stopPlace?.stopPlaceRef === ref);
  if (index > -1) {
    stops.splice(index, 1);
  }

  stops.push(place);

  if (stops.length > capacity) {
    stops.splice(0, stops.length - capacity);
  }

  await LocalStorage.setItem(KEY, JSON.stringify(stops));
}

export function getPlaceStops() {
  return LocalStorage.getItem<string>(KEY)
    .then((res) => res ?? "[]")
    .then((res) => JSON.parse(res) as PlaceResult[]);
}
