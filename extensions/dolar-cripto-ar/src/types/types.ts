import { CANCELED } from "../api";

export type Dollar = { name: string };

export type ApiResponse<T> = T | typeof CANCELED;

export interface DollarResponse {
  ahorro?: { ask: number; bid: number };
  blue?: { ask: number; bid: number };
  mep?: { al30: { "24hs": { price: number } } };
  ccl?: { al30: { "24hs": { price: number } } };
  // Add any other properties that are in the actual response
}

export interface CryptoPriceResponse {
  USD?: number;
  // Add any other currencies if present in the actual response
}

export interface StablePriceResponse {
  ask: number;
}
