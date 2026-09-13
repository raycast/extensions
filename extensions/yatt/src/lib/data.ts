import { environment } from "@raycast/api";
import { readFileSync } from "node:fs";
import path from "node:path";
import { rowsToCities, rowsToPlaces, type Dataset, type ZoneInfo } from "../core/dataset";
import type { Location } from "../core/types";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(environment.assetsPath, "data", file), "utf8")) as T;
}

let zones: ZoneInfo[] | undefined;
/** Small (≈80 KB); loaded on first use in every command. */
export function loadZones(): ZoneInfo[] {
  if (!zones) zones = readJson<{ zones: ZoneInfo[] }>("zones.json").zones;
  return zones;
}

let dataset: Dataset | undefined;
/** Large (≈9 MB); only loaded when a place is searched. */
export function loadDataset(): Dataset {
  if (!dataset) {
    dataset = {
      cities: rowsToCities(readJson("cities.json")),
      places: rowsToPlaces(readJson("places.json")),
      zones: loadZones(),
    };
  }
  return dataset;
}

export function loadSeed(): Location[] {
  return readJson<Location[]>("seed.json");
}

export function zoneInfo(tz: string): ZoneInfo | undefined {
  return loadZones().find((z) => z.name === tz);
}
