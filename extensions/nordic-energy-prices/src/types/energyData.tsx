import { priceRegion } from "../constants/preferences";

type FI_Type = {
  EUR_per_kWh: number;
  time_start: string;
  time_end: string;
};

type DK_Type = {
  DKK_per_kWh: number;
  EUR_per_kWh: number;
  time_start: string;
  time_end: string;
};

type SE_Type = {
  SEK_per_kWh: number;
  EUR_per_kWh: number;
  time_start: string;
  time_end: string;
};

type NO_Type = {
  NOK_per_kWh: number;
  EUR_per_kWh: number;
  time_start: string;
  time_end: string;
};

type PriceRegionMap = {
  NO1: NO_Type;
  NO2: NO_Type;
  NO3: NO_Type;
  NO4: NO_Type;
  NO5: NO_Type;
  DK1: DK_Type;
  DK2: DK_Type;
  SE1: SE_Type;
  SE2: SE_Type;
  SE3: SE_Type;
  SE4: SE_Type;
  FI: FI_Type;
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export type PriceType = PriceRegionMap[typeof priceRegion];

export let PriceCurrency: string;
export let PriceSuffix: string;
export let VAT: number;

switch (priceRegion) {
  case "DK1":
  case "DK2":
    PriceCurrency = "DKK_per_kWh";
    PriceSuffix = "DKK/kWh";
    VAT = 1.25;
    break;
  case "NO1":
  case "NO2":
  case "NO3":
  case "NO4":
  case "NO5":
    PriceCurrency = "NOK_per_kWh";
    PriceSuffix = "NOK/kWh";
    VAT = 1.25;
    break;
  case "SE1":
  case "SE2":
  case "SE3":
  case "SE4":
    PriceCurrency = "SEK_per_kWh";
    PriceSuffix = "SEK/kWh";
    VAT = 1.25;
    break;
  case "FI":
    PriceCurrency = "EUR_per_kWh";
    PriceSuffix = "€/kWh";
    VAT = 1.24;
    break;
}
