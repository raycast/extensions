import {
  trustedAirlineMenuBarLogoSource,
  trustedJumpseatAssetUrl,
} from "./assets";

export const AIRLINE_LOGO_ASSET_BASE_URL =
  "https://cdn.withjumpseat.com/airline-logos/";

// White menu bar logos keyed by logo code: both an entry's own code and the
// folder that holds its files, which is the folder a flight's logo URL names.
export type WhiteAirlineLogos = Readonly<Record<string, string>>;

const LOGO_CODE = /^[A-Z0-9]{3}$/;
const COHORT = /^[a-f0-9]{64}$/;
const REVISION = /^[A-Za-z0-9_-]{1,128}$/;
const LOGO_FOLDER = /^\/airline-logos\/([A-Z0-9]{3})\//;
// Menu bar icons are drawn at up to 22pt, so 192px stays sharp at 3x.
const MENU_BAR_RASTER_SIZE = 192;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The menu bar's SVG renderer paints gradients black, so take a PNG: the
// selected raster cohort, or the legacy PNG when the logo has no cohort.
function whiteLogoUrl(folder: string, white: unknown): string | undefined {
  if (!isRecord(white)) return undefined;
  let url: string | undefined;
  if (typeof white.cohort === "string") {
    const hasSize =
      Array.isArray(white.rasters) &&
      white.rasters.some(
        (raster) => isRecord(raster) && raster.size === MENU_BAR_RASTER_SIZE,
      );
    if (COHORT.test(white.cohort) && hasSize) {
      url = `${AIRLINE_LOGO_ASSET_BASE_URL}${folder}/rasters/white/${white.cohort}/${MENU_BAR_RASTER_SIZE}.png`;
    }
  } else if (white.cohort === null && isRecord(white.legacy)) {
    const revision = white.legacy.revision;
    if (typeof revision === "string" && REVISION.test(revision)) {
      url = `${AIRLINE_LOGO_ASSET_BASE_URL}${folder}/white.png?v=${revision}`;
    }
  }
  return trustedJumpseatAssetUrl(url, "airline-white-logo");
}

// Reads the v2 logo manifest (GET /api/v1/airlines/logos/manifest/v2). The
// manifest is the only place the backend publishes white logos: they have no
// binding on the airline, and an entry omits `white` when there is none.
export function parseWhiteAirlineLogos(
  body: unknown,
): WhiteAirlineLogos | undefined {
  if (
    !isRecord(body) ||
    body.schemaVersion !== 2 ||
    body.assetBaseUrl !== AIRLINE_LOGO_ASSET_BASE_URL ||
    !Array.isArray(body.logos)
  ) {
    return undefined;
  }

  const logos: Record<string, string> = {};
  for (const entry of body.logos) {
    if (!isRecord(entry) || typeof entry.code !== "string") continue;
    if (!LOGO_CODE.test(entry.code)) continue;
    const folder = entry.assetCode ?? entry.code;
    if (typeof folder !== "string" || !LOGO_CODE.test(folder)) continue;
    const url = whiteLogoUrl(folder, entry.white);
    if (!url) continue;
    logos[entry.code] = url;
    logos[folder] ??= url;
  }
  return logos;
}

export function isWhiteAirlineLogos(
  value: unknown,
): value is WhiteAirlineLogos {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([code, url]) =>
        LOGO_CODE.test(code) &&
        trustedJumpseatAssetUrl(url, "airline-white-logo") === url,
    )
  );
}

function logoFolder(logoUrl: string | null | undefined): string | undefined {
  const trusted = trustedJumpseatAssetUrl(logoUrl, "airline-logo");
  return trusted ? LOGO_FOLDER.exec(new URL(trusted).pathname)?.[1] : undefined;
}

// The menu bar icon: the airline's own logo on a light menu bar, and its white
// logo on a dark one when the airline has one. The logo URLs passed in already
// carry the flight's brand, so a rebranded flight gets the brand's white logo.
// A logo without a white variant keeps its dark (or light) logo.
export function trustedAirlineMenuBarIconSource(
  airline: { logoUrl?: string | null; logoDarkUrl?: string | null },
  whiteLogos: WhiteAirlineLogos | undefined,
): { light: string; dark: string } | undefined {
  const source = trustedAirlineMenuBarLogoSource(airline);
  if (!source) return undefined;
  const folder = logoFolder(airline.logoUrl) ?? logoFolder(airline.logoDarkUrl);
  const white = trustedJumpseatAssetUrl(
    folder ? whiteLogos?.[folder] : undefined,
    "airline-white-logo",
  );
  return white ? { light: source.light, dark: white } : source;
}
