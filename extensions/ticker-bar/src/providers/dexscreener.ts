import { createMicroBatcher } from "../market-batch";
import { formatPrice } from "../market-format";
import { fetchJson } from "../market-http";
import { Asset, Quote, SearchResult } from "../market-types";
import { chunk, finiteNumber, httpsImageUrl } from "./shared";

type DexPair = {
  chainId: string;
  dexId: string;
  url?: string;
  priceUsd: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  baseToken: { address: string; name: string; symbol: string };
  info?: { imageUrl?: string };
};

const loadDexTokenPairs = createMicroBatcher<string, DexPair[]>(
  async (keys) => {
    const groups = new Map<string, string[]>();
    for (const key of keys) {
      const separator = key.indexOf("|");
      const chain = key.slice(0, separator);
      const address = key.slice(separator + 1);
      groups.set(chain, [...(groups.get(chain) ?? []), address]);
    }

    const output = new Map<string, DexPair[]>();
    await Promise.all(
      [...groups.entries()].flatMap(([chain, addresses]) =>
        chunk(addresses, 30).map(async (addressChunk) => {
          const pairs = await fetchJson<DexPair[]>(
            `https://api.dexscreener.com/tokens/v1/${encodeURIComponent(chain)}/${encodeURIComponent(addressChunk.join(","))}`,
          );
          for (const address of addressChunk) {
            output.set(
              `${chain}|${address}`,
              pairs.filter(
                (pair) =>
                  pair.chainId.toLowerCase() === chain &&
                  pair.baseToken.address.toLowerCase() === address,
              ),
            );
          }
        }),
      ),
    );
    return output;
  },
);

export async function fetchTokenQuote(
  asset: Asset,
): Promise<Quote | undefined> {
  const requestedChain = asset.chain?.toLowerCase();
  const requestedAddress = asset.query.toLowerCase();
  const pairs =
    requestedChain && requestedChain !== "any"
      ? ((await loadDexTokenPairs(`${requestedChain}|${requestedAddress}`)) ??
        [])
      : ((
          await fetchJson<{ pairs?: DexPair[] }>(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(requestedAddress)}`,
          )
        ).pairs ?? []);
  const pair = pairs
    .filter(
      (candidate) =>
        candidate.baseToken.address.toLowerCase() === requestedAddress &&
        (!requestedChain ||
          requestedChain === "any" ||
          candidate.chainId.toLowerCase() === requestedChain),
    )
    .sort(
      (left, right) => (right.liquidity?.usd ?? 0) - (left.liquidity?.usd ?? 0),
    )[0];
  if (!pair) return undefined;

  // DexScreener repeats a token across liquidity pools. The deepest pool can
  // omit token metadata even when another pool includes the official artwork.
  const imageUrl = pairs
    .filter(
      (candidate) =>
        candidate.baseToken.address.toLowerCase() === requestedAddress &&
        (!requestedChain ||
          requestedChain === "any" ||
          candidate.chainId.toLowerCase() === requestedChain),
    )
    .map((candidate) => httpsImageUrl(candidate.info?.imageUrl))
    .find(Boolean);

  const price = Number(pair.priceUsd);
  if (!Number.isFinite(price)) return undefined;
  return {
    id: asset.id,
    kind: asset.kind,
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    price,
    priceLabel: formatPrice(price, "usd"),
    changePercent: pair.priceChange?.h24,
    provider: "DexScreener",
    asOf: new Date().toISOString(),
    url: pair.url,
    subtitle: `${pair.chainId} / ${pair.dexId}`,
    volume: finiteNumber(pair.volume?.h24),
    marketCap: finiteNumber(pair.marketCap ?? pair.fdv),
    imageUrl,
  };
}

export async function searchTokens(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  if (query.length < 3) return [];
  const json = await fetchJson<{ pairs?: DexPair[] }>(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
    signal,
  );
  const imageByToken = new Map<string, string>();
  for (const pair of json.pairs ?? []) {
    const imageUrl = httpsImageUrl(pair.info?.imageUrl);
    if (!imageUrl) continue;
    imageByToken.set(tokenKey(pair), imageUrl);
  }

  const seen = new Set<string>();
  return (json.pairs ?? [])
    .filter((pair) => Number.isFinite(Number(pair.priceUsd)))
    .sort(
      (left, right) => (right.liquidity?.usd ?? 0) - (left.liquidity?.usd ?? 0),
    )
    .filter((pair) => {
      const key = tokenKey(pair);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map((pair) => ({
      id: `token:${pair.chainId}:${pair.baseToken.address}`,
      kind: "token" as const,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      provider: "DexScreener",
      query: pair.baseToken.address,
      subtitle: `${pair.chainId} / ${pair.dexId} / ${formatPrice(Number(pair.priceUsd), "usd")}`,
      url: pair.url,
      imageUrl: imageByToken.get(tokenKey(pair)),
    }));
}

function tokenKey(pair: DexPair) {
  return `${pair.chainId.toLowerCase()}:${pair.baseToken.address.toLowerCase()}`;
}
