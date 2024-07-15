import fetch from "node-fetch";
import { DollarResponse, CryptoPriceResponse } from "./types/types";

export const fetchDollarRates = async (signal: AbortSignal): Promise<DollarResponse> => {
  const response = await fetch("https://criptoya.com/api/dolar", { signal });
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }
  const result = (await response.json()) as DollarResponse;
  return result;
};

export const fetchBtcPrice = async (signal: AbortSignal): Promise<CryptoPriceResponse> => {
  const response = await fetch("https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD", { signal });
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }
  const result = (await response.json()) as CryptoPriceResponse;
  return result;
};

export const fetchEthPrice = async (signal: AbortSignal): Promise<CryptoPriceResponse> => {
  const response = await fetch("https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD", { signal });
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }
  const result = (await response.json()) as CryptoPriceResponse;
  return result;
};
