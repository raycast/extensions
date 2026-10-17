import { LocalStorage } from "@raycast/api";
import { createMicroBatcher } from "../market-batch";
import { fetchJson } from "../market-http";
import { httpsImageUrl } from "./shared";

type CoinGeckoLogoMarket = {
  symbol: string;
  image?: string;
};

type LogoCache = {
  retryAfterAt?: number;
  entries: Record<string, { imageUrl: string | null; expiresAt: number }>;
};

const LOGO_CACHE_KEY = "crypto-logo-cache.v1";
const LOGO_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const MISSING_LOGO_TTL_MS = 24 * 60 * 60 * 1_000;
const FAILURE_COOLDOWN_MS = 15 * 60 * 1_000;

// Perpetual symbols arrive together during a watchlist refresh, so resolve
// their artwork in one CoinGecko request instead of one request per contract.
const loadCryptoLogos = createMicroBatcher<string, string>(async (symbols) => {
  const now = Date.now();
  const cache = await readLogoCache();
  const output = new Map<string, string>();
  const missing: string[] = [];

  for (const symbol of symbols) {
    const entry = cache.entries[symbol];
    if (entry?.expiresAt && entry.expiresAt > now) {
      if (entry.imageUrl) output.set(symbol, entry.imageUrl);
    } else {
      missing.push(symbol);
    }
  }

  // Logo enrichment is optional. Respect a shared, cross-worker cooldown after
  // CoinGecko throttles us instead of letting every Raycast worker retry.
  if (!missing.length || (cache.retryAfterAt ?? 0) > now) return output;

  try {
    const data = await fetchJson<CoinGeckoLogoMarket[]>(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&symbols=${encodeURIComponent(missing.join(","))}&include_tokens=top&per_page=${missing.length}&sparkline=false`,
    );
    const resolved = new Map(
      data.flatMap((coin) => {
        const imageUrl = httpsImageUrl(coin.image);
        return imageUrl ? [[coin.symbol.toUpperCase(), imageUrl] as const] : [];
      }),
    );
    for (const symbol of missing) {
      const imageUrl = resolved.get(symbol) ?? null;
      cache.entries[symbol] = {
        imageUrl,
        expiresAt: now + (imageUrl ? LOGO_TTL_MS : MISSING_LOGO_TTL_MS),
      };
      if (imageUrl) output.set(symbol, imageUrl);
    }
    cache.retryAfterAt = undefined;
  } catch {
    cache.retryAfterAt = now + FAILURE_COOLDOWN_MS;
  }
  await LocalStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(cache));
  return output;
});

export async function fetchCryptoLogo(
  symbol: string,
): Promise<string | undefined> {
  return loadCryptoLogos(symbol.toUpperCase());
}

async function readLogoCache(): Promise<LogoCache> {
  const stored = await LocalStorage.getItem<string>(LOGO_CACHE_KEY);
  if (!stored) return { entries: {} };
  try {
    const parsed = JSON.parse(stored) as Partial<LogoCache>;
    return {
      retryAfterAt:
        typeof parsed.retryAfterAt === "number"
          ? parsed.retryAfterAt
          : undefined,
      entries:
        parsed.entries && typeof parsed.entries === "object"
          ? parsed.entries
          : {},
    };
  } catch {
    return { entries: {} };
  }
}
