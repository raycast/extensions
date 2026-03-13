import stationsData from "./stations.json";
import { capitalize } from "../utils";
import { Station } from "../models/station";

export function getStations() {
  const stations: Station[] = stationsData.map((station) => ({ ...station, name: capitalize(station.name) }));
  return stations;
}
