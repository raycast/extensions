export type Region =
  | "BAY" // Bay Wheels (SF)
  | "BKN" // Citibike (NYC)
  | "CHI" // Divvy (Chicago)
  | "DC" // Capital Bikeshare (Washington DC)
  | "PDX"; // Biketown (Portland)

export interface Preferences {
  region: Region;
}

interface Config {
  name: string;
  region_name: string;
  status_url_key: string;
}

export const REGION_CONFIG: Record<Region, Config> = {
  BAY: {
    name: "Bay Wheels",
    region_name: "San Francisco Bay Area",
    status_url_key: "bay",
  },
  BKN: {
    name: "Citi Bike",
    region_name: "New York City",
    status_url_key: "bkn",
  },
  CHI: {
    name: "Divvy",
    region_name: "Chicago",
    status_url_key: "chi",
  },
  DC: {
    name: "Capital Bikeshare",
    region_name: "Washington DC",
    status_url_key: "dca-cabi",
  },
  PDX: {
    name: "Biketown",
    region_name: "Portland",
    status_url_key: "pdx",
  },
};

export const REGION_STATUS_URL = (region: Region): string =>
  `https://gbfs.lyft.com/gbfs/2.3/${REGION_CONFIG[region].status_url_key}/en/station_status.json`;

export const REGION_INFORMATION_URL = (region: Region): string =>
  `https://gbfs.lyft.com/gbfs/2.3/${REGION_CONFIG[region].status_url_key}/en/station_information.json`;
