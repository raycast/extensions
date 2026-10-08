import { Image } from "@raycast/api";

type MarketWithLogo = {
  imageUrl?: string;
  provider?: string;
};

const PROVIDER_LOGOS: Record<string, string> = {
  DexScreener: "https://dexscreener.com/favicon.png",
};

export function marketLogo(
  market: MarketWithLogo | undefined,
  fallback?: Image.Fallback,
): Image.ImageLike | undefined {
  const source = market?.imageUrl ?? providerLogo(market?.provider);
  if (!source) return undefined;
  return {
    source,
    ...(fallback ? { fallback } : {}),
    mask: Image.Mask.Circle,
  };
}

function providerLogo(provider: string | undefined) {
  return provider ? PROVIDER_LOGOS[provider] : undefined;
}
