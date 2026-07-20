/* raw data as it is returned from DWD API */
export type PollenflugApiData = {
  next_update: string;
  last_update: string;
  name: string; // "Pollenflug-Gefahrenindex für Deutschland ausgegeben vom Deutschen Wetterdienst"
  content: (Location & { Pollen: { [key: string]: Record<Day, string> } })[];
  sender: string; // "Deutscher Wetterdienst - Medizin-Meteorologie"
};

/* location-specific and cleaned up data */
export type Pollenflug = {
  location: Location;
  pollen: PollenflugItem[];
};

export type Day = "today" | "tomorrow" | "dayafter_to";

export const DayDict: Record<Day, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  dayafter_to: "Day after tomorrow",
};

export type PollenflugItem = {
  name: string;
} & Record<Day, string>;

export type Location = {
  partregion_id: number;
  partregion_name: string;
  region_id: number;
  region_name: string;
};
