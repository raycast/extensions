export interface Country {
  name: {
    common: string;
    official: string;
  };
  capital: string[];
  cca2: string;
  cca3: string;
  population: number;
  area: number;
  currencies: Currencies;
  idd: {
    root: string;
    suffixes: [];
  };
  flag: string;
  flags: {
    png: string;
    svg: string;
  };
  maps: {
    googleMaps: string;
    openStreetMaps: string;
  };
  coatOfArms: {
    png: string;
    svg: string;
  };
  startOfWeek: string;
  continents: string[];
  tld: string[];
}

interface Currency {
  name: string;
  symbol: string;
}

type Currencies = { [key: string]: Currency };

export interface Preferences {
  showCoatOfArms: boolean;
}
