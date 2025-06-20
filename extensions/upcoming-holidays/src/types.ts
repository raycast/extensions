import { HolidaysTypes } from "date-holidays";

// country-locale-map
export interface Country {
  name: string;
  alpha2: string;
  alpha3: string;
  numeric: string;
  locales: string[];
  default_locale: string;
  currency: string;
  currency_name: string;
  languages: string[];
  capital: string;
  emoji: string;
  emojiU: string;
  fips: string;
  internet: string;
  continent: string;
  region: string;
  alternate_names?: string[];
  latitude?: number;
  longitude?: number;
}

export interface CountryHasStates extends Country {
  states?: boolean;
}

export interface TranslatedHoliday extends HolidaysTypes.Holiday {
  englishName?: string;
}

export enum HolidayTypeFilter {
  Public = "public",
  Bank = "bank",
  Optional = "optional",
  School = "school",
  Observance = "observance",
}

export interface PinnedState {
  stateCode: string;
  stateName: string;
  country: Country;
}

export interface PinnedStates {
  [countryCode: string]: PinnedState[];
}
