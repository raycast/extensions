// `country-data-list` exposes its types only through the package `exports`
// map, which the extension's classic `moduleResolution: "node"` can't read.
// Declare the slice we use so it stays fully typed under strict mode.
declare module "country-data-list" {
  export interface CurrencyData {
    code: string;
    name: string;
    symbol?: string;
    decimals: number;
    number: string;
  }
  export const currencies: { all: CurrencyData[] };
}
