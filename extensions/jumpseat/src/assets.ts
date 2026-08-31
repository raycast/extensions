const JUMPSEAT_ASSET_HOST = "cdn.withjumpseat.com";

export type JumpseatAssetKind = "airline-logo" | "country-flag";

const assetPathPatterns: Record<JumpseatAssetKind, RegExp> = {
  "airline-logo": /^\/airline-logos\/[A-Z0-9]{3}\/(?:light|dark)\.svg$/,
  "country-flag": /^\/country-flags\/[A-Z]{2}\.svg$/,
};

export function trustedJumpseatAssetUrl(
  value: unknown,
  kind: JumpseatAssetKind,
): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    return undefined;
  }

  try {
    const url = new URL(value);
    const queryKeys = [...url.searchParams.keys()];
    if (
      url.protocol !== "https:" ||
      url.hostname !== JUMPSEAT_ASSET_HOST ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      queryKeys.some((key) => key !== "v") ||
      queryKeys.length > 1 ||
      !assetPathPatterns[kind].test(url.pathname)
    ) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}
