export enum STARTING_POINT {
  CURRENT_LOCATION = "",
  HOME = "home",
  CUSTOM_LOCATION = "custom",
}

/**
 * Corresponds to Google Map's four possible modes of travel.
 */
export enum TRAVEL_MODE {
  DRIVING_OSM = "fossgis_osrm_car",
  DRIVING_GHP = "graphhopper_car",
  WALKING_OSM = "fossgis_osrm_foot",
  WALKING_GHP = "graphhopper_foot",
  BICYCLING_OSM = "fossgis_osrm_bike",
  BICYCLING_GHP = "graphhopper_bicycle",
}

/**
 * Corresponds to the preferences defined in package.json.
 */
export interface Preferences {
  homeAddress: string;
  preferredMode: string;
}

/**
 * Corresponds to the argument defined in package.json.
 */
export interface SearchQueryArguments {
  query: "string";
}
