const JUMPSEAT_ASSET_HOST = "cdn.withjumpseat.com";
const JUMPSEAT_API_HOST = "api.withjumpseat.com";
const PROFILE_PICTURE_PATH_PREFIX =
  "/api/v1/media/profile-pictures/profile-pictures/";

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

export function trustedProfilePictureUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== JUMPSEAT_API_HOST ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(PROFILE_PICTURE_PATH_PREFIX)
    ) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}
