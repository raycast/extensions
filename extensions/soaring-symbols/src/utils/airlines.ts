import type { Airline, AssetType } from "soaring-symbols";

// The npm release line the extension reads, served by jsDelivr. Every 0.2.x
// release (new airlines, fixed SVGs) arrives without a store update; a
// breaking 0.3.0 never does. Move this, and the soaring-symbols dependency,
// to the next line in the same extension update.
const DATA_LINE = "0.2";
const CDN = `https://cdn.jsdelivr.net/npm/soaring-symbols@${DATA_LINE}/dist`;

export const AIRLINES_URL = `${CDN}/airlines.json`;

const ASSET_TYPES: AssetType[] = ["logo", "icon", "tail"];

const assetUrl = (airline: Airline, file: string) => `${CDN}/assets/${airline.slug}/${file}.svg`;

// Whether fetched JSON is a usable airline list: a non-empty array of
// airlines that each have a slug and assets. Anything else, including an
// empty list, falls back to the bundled one.
export const isAirlineList = (data: unknown): data is Airline[] =>
  Array.isArray(data) &&
  data.length > 0 &&
  data.every((a) => typeof a?.slug === "string" && typeof a?.assets === "object" && a.assets !== null);

interface AssetTile {
  /** Tile id and download name, e.g. "logo" or "logo-mono". */
  variant: string;
  url: string;
  /** A monochrome version, drawn in currentColor, which the extension tints. */
  mono: boolean;
}

// A tile for each file the airline ships: the color version and, when it
// exists, the -mono one (always there for single-color marks)
export const getAssetTiles = (airline: Airline): AssetTile[] =>
  ASSET_TYPES.flatMap((type) => {
    const info = airline.assets[type];
    if (!info) return [];

    const tiles: AssetTile[] = [];
    if (info.color) tiles.push({ variant: type, url: assetUrl(airline, type), mono: false });
    if (info.mono) tiles.push({ variant: `${type}-mono`, url: assetUrl(airline, `${type}-mono`), mono: true });

    return tiles;
  });

// The first file to show for a type: its color version, else its mono one
export const previewUrl = (airline: Airline, type: AssetType): string | undefined => {
  const info = airline.assets[type];
  if (!info) return undefined;

  return assetUrl(airline, info.color ? type : `${type}-mono`);
};
