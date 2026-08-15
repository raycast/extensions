import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export const priceRegion: string = preferences.priceRegion;
export const includeVAT: boolean = preferences.vat;
export const PriceCurrency: string = includeVAT ? "Price incl. VAT" : "Price excl. VAT";

export let BASEURL: string;
switch (priceRegion) {
  case "DK1":
    BASEURL = "https://www.elprisenligenu.dk/api/v1/prices/[YEAR]/[MONTH]-[DAY]_DK1.json";
    break;
  case "DK2":
    BASEURL = "https://www.elprisenligenu.dk/api/v1/prices/[YEAR]/[MONTH]-[DAY]_DK2.json";
    break;
  case "NO1":
    BASEURL = "https://www.hvakosterstrommen.no/api/v1/prices/[YEAR]/[MONTH]-[DAY]_NO1.json";
    break;
  case "NO2":
    BASEURL = "https://www.hvakosterstrommen.no/api/v1/prices/[YEAR]/[MONTH]-[DAY]_NO2.json";
    break;
  case "NO3":
    BASEURL = "https://www.hvakosterstrommen.no/api/v1/prices/[YEAR]/[MONTH]-[DAY]_NO3.json";
    break;
  case "NO4":
    BASEURL = "https://www.hvakosterstrommen.no/api/v1/prices/[YEAR]/[MONTH]-[DAY]_NO4.json";
    break;
  case "NO5":
    BASEURL = "https://www.hvakosterstrommen.no/api/v1/prices/[YEAR]/[MONTH]-[DAY]_NO5.json";
    break;
  case "SE1":
    BASEURL = "https://www.elprisetjustnu.se/api/v1/prices/[YEAR]/[MONTH]-[DAY]_SE1.json";
    break;
  case "SE2":
    BASEURL = "https://www.elprisetjustnu.se/api/v1/prices/[YEAR]/[MONTH]-[DAY]_SE2.json";
    break;
  case "SE3":
    BASEURL = "https://www.elprisetjustnu.se/api/v1/prices/[YEAR]/[MONTH]-[DAY]_SE3.json";
    break;
  case "SE4":
    BASEURL = "https://www.elprisetjustnu.se/api/v1/prices/[YEAR]/[MONTH]-[DAY]_SE4.json";
    break;
  case "FI":
    BASEURL = "https://www.sahkonhintatanaan.fi/api/v1/prices/[YEAR]/[MONTH]-[DAY].json";
    break;
}

export const HEADERS = {
  "Content-Type": "application/json",
};
