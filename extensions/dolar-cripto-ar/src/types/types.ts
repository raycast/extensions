export type Dollar = { name: string };

export type DollarResponse = {
  blue: { ask: number };
  mep: { al30: { "24hs": { price: number } } };
  ccl: { al30: { "24hs": { price: number } } };
};

export interface CryptoPriceResponse {
  USD: number;
}
