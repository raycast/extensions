export type Country = {
  name: string;
  iso2: string;
  emoji: string;
};

export type City = {
  name: string;
  countryCode: string;
};

export type GeoNamesResponse = {
  totalResultsCount: number;
  geonames: City[];
};

export type UserSelection = {
  selectedCountry: Country | undefined;
  selectedCity: string | undefined;
  hoursSystem?: string;
};

export type AthanTimings = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Firstthird: string;
  Midnight: string;
  Lastthird: string;
};

export type AthanResponse = {
  data: {
    timings: AthanTimings;
  };
};
