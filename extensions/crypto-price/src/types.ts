// Hand-written rather than the generated `Preferences` global: this extension's tsconfig
// scopes the compile to `src/**` (for the `#/*` alias + ts-jest tests) and doesn't include
// the generated `raycast-env.d.ts`, so the global isn't in scope here.
export interface Preferences {
  source: string;
  currency: string;
  style: string;
  coins: string;
  cryptoCompareApiKey?: string;
}

export interface Coin {
  name: string;
  symbol: string;
  price: number;
  high24h: number;
  low24h: number;
  /** The fiat/quote currency `price` is actually denominated in (e.g. "USD", "BRL"). */
  quoteCurrency: string;
  priceDisplay: string;
  more: Record<string, string>;
}

export type Coins = Record<string, Coin>;

/**
 * A price source: given a quote currency and coin symbols, resolves the coins it
 * could fetch. MUST throw on any failure (network, non-2xx, empty) so the
 * orchestrator can fail over to the next source.
 */
export type Fetcher = (currency: string, symbols: string[]) => Promise<Coins>;

export type SourceName = "Binance" | "CoinGecko" | "OKX" | "Coinbase" | "Kraken" | "CryptoCompare";
