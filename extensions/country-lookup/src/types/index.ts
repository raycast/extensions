export interface Country {
  /** Common and official country name */
  name: {
    common: string;
    official: string;
    nativeName: Record<string, { official: string; common: string }>;
  };
  /** Alternate spellings of the country name */
  altSpellings: string[];
  /** Capital city or cities */
  capital: string[];
  /** ISO 3166-1 alpha-2 two-letter country codes */
  cca2: string;
  /** ISO 3166-1 alpha-3 three-letter country codes */
  cca3: string;
  /** ISO 3166-1 numeric code (UN M49) */
  ccn3: string;
  /** Country population */
  population: number;
  /** Geographical size */
  area: number;
  /** Country borders */
  borders: string[];
  /** Car info */
  car: {
    /** Car distinguised (oval) signs */
    signs: string[];
    /** Car driving side */
    side: string;
  };
  /** Country currencies */
  currencies: Currencies;
  /** International dialing codes */
  idd: {
    /** International dialing prefix */
    root: string;
    /** International dialing suffixes */
    suffixes: [];
  };
  /** List of official languages */
  languages: Record<string, string>;
  /** Country flag symbol (ASCII) */
  flag: string;
  /** Flagpedia links to country flags */
  flags: {
    png: string;
    svg: string;
    alt: string;
  };
  /** Links to Google Maps and OpenStreetMaps */
  maps: {
    googleMaps: string;
    openStreetMaps: string;
  };
  /** MainFacts.com links to svg and png images */
  coatOfArms: {
    png: string;
    svg: string;
  };
  /** Country start of week */
  startOfWeek: string;
  /** List of continents the country is on */
  continents: string[];
  /** Top level domain */
  tld: string[];
  /** Code of the International Olympic Committee */
  cioc: string;
  /** ISO 3166-1 independence status (the country is considered a sovereign state) */
  independent: boolean;
  /** UN Member status */
  unMember: boolean;
  /** ISO 3166-1 assignment status */
  status: string;
  /** UN demographic regions */
  region: string;
  /** UN demographic subregions */
  subregion: string;
  /** List of country name translations */
  translations: Record<
    string,
    {
      official: string;
      common: string;
    }
  >;
  /** FIFA code */
  fifa: string;
  /** Worldbank Gini index */
  gini: Record<string, number>;
  /** Genderized inhabitants of the country */
  demonyms: Record<
    string,
    {
      f: string;
      m: string;
    }
  >;
  /** Timezones (might not be available in V3?) */
  timezones?: string[];
  /** Capital info (might not be available in V3?) */
  capitalInfo?: {
    latlng: [number, number];
  };
  /** Postal code format (might not be available in V3?) */
  postalCode?: {
    format: string;
    regex: string;
  };
  /** Landlocked country */
  landlocked: boolean;
}

interface Currency {
  name: string;
  symbol: string;
}

type Currencies = { [key: string]: Currency };
