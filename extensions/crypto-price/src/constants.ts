export type CoinMeta = {
  name: string;
  /** CoinGecko coin id (needed by the CoinGecko source). */
  geckoId?: string;
  /** Kraken base-asset override (Kraken renames a few assets, e.g. BTC -> XBT). */
  krakenBase?: string;
};

// Common coins with the per-source identifiers we need.
// Symbols not listed here still work on USDT-pair sources (Binance/OKX/Coinbase/Kraken);
// only CoinGecko requires the `geckoId` mapping, so unknown symbols are skipped there.
export const COINS: Record<string, CoinMeta> = {
  BTC: { name: "Bitcoin", geckoId: "bitcoin", krakenBase: "XBT" },
  ETH: { name: "Ethereum", geckoId: "ethereum" },
  BNB: { name: "BNB", geckoId: "binancecoin" },
  SOL: { name: "Solana", geckoId: "solana" },
  XRP: { name: "XRP", geckoId: "ripple" },
  USDT: { name: "Tether", geckoId: "tether" },
  USDC: { name: "USD Coin", geckoId: "usd-coin" },
  ADA: { name: "Cardano", geckoId: "cardano" },
  DOGE: { name: "Dogecoin", geckoId: "dogecoin", krakenBase: "XDG" },
  AVAX: { name: "Avalanche", geckoId: "avalanche-2" },
  DOT: { name: "Polkadot", geckoId: "polkadot" },
  MATIC: { name: "Polygon", geckoId: "matic-network" },
  POL: { name: "Polygon", geckoId: "polygon-ecosystem-token" },
  LINK: { name: "Chainlink", geckoId: "chainlink" },
  TRX: { name: "TRON", geckoId: "tron" },
  LTC: { name: "Litecoin", geckoId: "litecoin" },
  BCH: { name: "Bitcoin Cash", geckoId: "bitcoin-cash" },
  XLM: { name: "Stellar", geckoId: "stellar" },
  ATOM: { name: "Cosmos", geckoId: "cosmos" },
  UNI: { name: "Uniswap", geckoId: "uniswap" },
  ETC: { name: "Ethereum Classic", geckoId: "ethereum-classic" },
  FIL: { name: "Filecoin", geckoId: "filecoin" },
  APT: { name: "Aptos", geckoId: "aptos" },
  ARB: { name: "Arbitrum", geckoId: "arbitrum" },
  OP: { name: "Optimism", geckoId: "optimism" },
  NEAR: { name: "NEAR Protocol", geckoId: "near" },
  INJ: { name: "Injective", geckoId: "injective-protocol" },
  SUI: { name: "Sui", geckoId: "sui" },
  TON: { name: "Toncoin", geckoId: "the-open-network" },
  SHIB: { name: "Shiba Inu", geckoId: "shiba-inu" },
  PEPE: { name: "Pepe", geckoId: "pepe" },
};
