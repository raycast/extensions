export type TimeEntry = {
  id: string;
  city: string;
  country: string;
  isoCode: string;
  timeZone: string;
  state?: string;
};

// Type definitions for the JSON structure
export type TimeZoneData = {
  zone: string;
  cities: string[];
};

export type StateData = {
  state: string;
  timeZones: TimeZoneData[];
};

export type CountryData = {
  country: string;
  isoCode: string;
  states?: StateData[];
  timeZones?: TimeZoneData[];
};

export type TimeGroup = {
  time: string;
  signature: string;
  cities: string[];
  combinedFlags: string;
};

export type LocationEntry = TimeEntry | (Omit<TimeEntry, "id"> & { state?: string });
