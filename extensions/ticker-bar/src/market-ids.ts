import { Asset, AssetKind } from "./market-types";

const KINDS = new Set<AssetKind>([
  "stock",
  "crypto",
  "token",
  "polymarket",
  "binance",
  "binanceperp",
]);

export type ParsedWatchlist = {
  ids: string[];
  invalid: string[];
};

export function normalizeAssetId(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (/^[A-Z.]{1,10}$/i.test(value)) return `stock:${value.toUpperCase()}`;
  if (/^0x[a-f0-9]{40}$/i.test(value))
    return `token:any:${value.toLowerCase()}`;

  const [rawKind] = value.split(":");
  const kind = rawKind.toLowerCase();
  if (!isAssetKind(kind)) return undefined;

  const parts = value.split(":");
  switch (kind) {
    case "stock": {
      const symbol = parts[1]?.trim().toUpperCase();
      return symbol && /^[A-Z0-9.^-]{1,20}$/.test(symbol)
        ? `stock:${symbol}`
        : undefined;
    }
    case "crypto": {
      const id = parts.slice(1).join(":").trim().toLowerCase();
      return /^[a-z0-9][a-z0-9-]{0,99}$/.test(id) ? `crypto:${id}` : undefined;
    }
    case "token": {
      const chain = parts[1]?.trim().toLowerCase();
      const address = parts.slice(2).join(":").trim();
      if (!chain || !/^[a-z0-9_-]{1,40}$/i.test(chain)) return undefined;
      if (!address || !/^[a-z0-9._:-]{3,160}$/i.test(address)) return undefined;
      return `token:${chain}:${address.toLowerCase()}`;
    }
    case "polymarket": {
      const marketId = parts[1]?.trim();
      const outcome = parts.slice(2).join(":").trim().toLowerCase() || "yes";
      if (!marketId || !/^[a-z0-9_-]{1,100}$/i.test(marketId)) return undefined;
      if (!/^[a-z0-9 ._'-]{1,100}$/i.test(outcome)) return undefined;
      return `polymarket:${marketId}:${outcome}`;
    }
    case "binance":
    case "binanceperp": {
      const pair = parts[1]?.trim().toUpperCase();
      if (!pair || !/^[A-Z0-9]{5,30}$/.test(pair)) return undefined;
      return `${kind}:${pair}`;
    }
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function parseWatchlist(value: string): string[] {
  return parseWatchlistInput(value).ids;
}

export function parseWatchlistInput(value: string): ParsedWatchlist {
  const tokens = value
    .split(/\r?\n|[,;|]+/)
    .flatMap((line) => line.split(/\s+(?=[a-z]+:)/i))
    .map((token) => token.split("#")[0].trim())
    .filter(Boolean);

  const ids: string[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    const normalized = normalizeAssetId(token);
    if (normalized) ids.push(normalized);
    else invalid.push(token);
  }
  return { ids: [...new Set(ids)], invalid };
}

export function assetFromId(id: string): Asset | undefined {
  const normalized = normalizeAssetId(id);
  if (!normalized) return undefined;
  const parts = normalized.split(":");
  const kind = parts[0];
  if (!isAssetKind(kind)) return undefined;

  switch (kind) {
    case "stock": {
      const symbol = parts[1];
      return {
        id: normalized,
        kind,
        symbol,
        name: symbol,
        provider: "Yahoo Finance",
        query: symbol,
      };
    }
    case "crypto": {
      const coinId = parts[1];
      return {
        id: normalized,
        kind,
        symbol: coinId.toUpperCase(),
        name: coinId,
        provider: "CoinGecko",
        query: coinId,
      };
    }
    case "token": {
      const chain = parts[1];
      const address = parts.slice(2).join(":");
      return {
        id: normalized,
        kind,
        symbol: address.slice(0, 6),
        name: `${chain}:${address.slice(0, 10)}`,
        provider: "DEX Screener",
        query: address,
        chain,
      };
    }
    case "polymarket": {
      const marketId = parts[1];
      const outcome = parts.slice(2).join(":") || "yes";
      return {
        id: normalized,
        kind,
        symbol: "POLY",
        name: `Polymarket ${marketId}`,
        provider: "Polymarket",
        query: marketId,
        outcome,
      };
    }
    case "binance":
    case "binanceperp": {
      const pair = parts[1];
      const base = binancePairBase(pair);
      return {
        id: normalized,
        kind,
        symbol: base,
        name:
          kind === "binanceperp"
            ? `${base} Perpetual`
            : `${base} / ${pair.slice(base.length) || "USDT"}`,
        provider: kind === "binanceperp" ? "Binance Futures" : "Binance",
        query: pair,
      };
    }
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function isAssetKind(value: string): value is AssetKind {
  return KINDS.has(value as AssetKind);
}

const BINANCE_QUOTE_ASSETS = [
  "USDT",
  "FDUSD",
  "USDC",
  "BUSD",
  "TUSD",
  "BTC",
  "ETH",
  "BNB",
  "EUR",
];

export function binancePairBase(pair: string): string {
  for (const quote of BINANCE_QUOTE_ASSETS) {
    if (pair.length > quote.length && pair.endsWith(quote))
      return pair.slice(0, -quote.length);
  }
  return pair;
}
