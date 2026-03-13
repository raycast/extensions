import fetch from "node-fetch";

const BASE_URL = "https://api.octopus.energy/v1";
const TARIFF_CODE_TEMPLATE = "E-1R-<PRODUCT_CODE>-<REGION>";

// https://en.wikipedia.org/wiki/Distribution_network_operator#History
export const REGIONS = {
  A: "East England",
  B: "East Midlands",
  C: "London",
  D: "North Wales, Merseyside and Cheshire",
  E: "West Midlands",
  F: "North East England",
  G: "North West England",
  H: "Southern England",
  J: "South East England",
  K: "South Wales",
  L: "South West England",
  M: "Yorkshire",
  N: "South and Central Scotland",
  P: "North Scotland",
} as const;

export type Region = keyof typeof REGIONS;

export interface Price {
  value_inc_vat: number;
  valid_from: string;
  valid_to: string;
}

interface FetchPricesResponse {
  results: Price[];
}

interface GetAgilePricesOptions {
  region: Region;
  productCode: string;
}

export async function getAgilePrices({ region, productCode }: GetAgilePricesOptions) {
  const tariffCode = TARIFF_CODE_TEMPLATE.replace("<PRODUCT_CODE>", productCode).replace("<REGION>", region);

  const url = `${BASE_URL}/products/${productCode}/electricity-tariffs/${tariffCode}/standard-unit-rates/`;

  const response = await fetch(url);
  const json = (await response.json()) as FetchPricesResponse;

  return json.results;
}
