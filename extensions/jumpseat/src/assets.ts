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

// Theme-aware airline logo. The light asset is drawn for light backgrounds and
// the dark asset for dark ones; either falls back to the other when missing.
export function trustedAirlineLogoSource(airline: {
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
}): { light: string; dark: string } | undefined {
  const light = trustedJumpseatAssetUrl(airline.logoUrl, "airline-logo");
  const dark = trustedJumpseatAssetUrl(airline.logoDarkUrl, "airline-logo");
  const fallback = light ?? dark;
  if (!fallback) return undefined;
  return { light: light ?? fallback, dark: dark ?? fallback };
}

function airlineLogoPngUrl(svgUrl: string): string {
  const url = new URL(svgUrl);
  url.pathname = url.pathname.replace(/\.svg$/, ".png");
  return url.toString();
}

// The menu bar's SVG renderer paints gradient fills black (e.g. Qatar's dark
// logo), so use the PNG the CDN publishes alongside every airline SVG.
export function trustedAirlineMenuBarLogoSource(airline: {
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
}): { light: string; dark: string } | undefined {
  const source = trustedAirlineLogoSource(airline);
  if (!source) return undefined;
  return {
    light: airlineLogoPngUrl(source.light),
    dark: airlineLogoPngUrl(source.dark),
  };
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
