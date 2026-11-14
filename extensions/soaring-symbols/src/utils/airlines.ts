import type { Airline, AssetType, HistoricalMarks } from "soaring-symbols";

// The npm release line the extension reads, served by jsDelivr. Every 0.3.x
// release (new airlines, fixed SVGs) arrives without a store update; a
// breaking 0.4.0 never does. Move this, and the soaring-symbols dependency,
// to the next line in the same extension update.
const DATA_LINE = "0.3";

// Asks jsDelivr which release the line points at now, e.g. "0.2.4"
export const RESOLVE_URL = `https://data.jsdelivr.com/v1/packages/npm/soaring-symbols/resolved?specifier=${DATA_LINE}`;

// An exact release in the line, e.g. "0.2.4"
export const isLineRelease = (version: unknown): version is string =>
  typeof version === "string" && version.startsWith(`${DATA_LINE}.`) && /^\d+\.\d+\.\d+$/.test(version);

// The release the airline list came from. Files load from that exact
// release, not from the line: a line URL keeps its address when a release
// changes the file behind it (a new logo), and Raycast's image cache, which
// jsDelivr lets keep a file for 7 days, would go on showing the old one.
// The line is the fallback when the release isn't known.
let dataVersion = DATA_LINE;

export const setDataVersion = (version?: string) => {
  dataVersion = isLineRelease(version) ? version : DATA_LINE;
};

const cdnBase = (version: string) => `https://cdn.jsdelivr.net/npm/soaring-symbols@${version}/dist`;

// airlines.json from `release`, or from the line when it's unknown
export const airlinesUrl = (release?: string) =>
  `${cdnBase(isLineRelease(release) ? release : DATA_LINE)}/airlines.json`;

const ASSET_TYPES: AssetType[] = ["logo", "icon", "tail"];

// What both commands search: name, codes, slug, callsign and the names a
// renamed airline flew under before (T'way Air for Trinity Airways)
export const searchKeywords = (airline: Airline): string[] =>
  [airline.name, airline.iata, airline.icao, airline.slug, airline.callsign, ...(airline.previous_names ?? [])].filter(
    (k): k is string => Boolean(k),
  );

// The airline that owns each one, and the ones each owns, looked up by slug.
// A parent missing from the list (an older data release) is left out.
export const groupAirlines = (airlines: Airline[]) => {
  const bySlug = new Map(airlines.map((a) => [a.slug, a]));
  const parents = new Map<string, Airline>();
  const subsidiaries = new Map<string, Airline[]>();
  for (const airline of airlines) {
    const parent = airline.parent && bySlug.get(airline.parent);
    if (!parent) continue;
    parents.set(airline.slug, parent);
    subsidiaries.set(parent.slug, [...(subsidiaries.get(parent.slug) ?? []), airline]);
  }

  return { bySlug, parents, subsidiaries };
};

// The folder of the current marks, or with `mark` of the older ones
// introduced in mark.since
const assetUrl = (airline: Airline, file: string, mark?: HistoricalMarks) =>
  `${cdnBase(dataVersion)}/assets/${airline.slug}${mark ? `/history/${mark.since}` : ""}/${file}.svg`;

// Whether fetched JSON is a usable airline list: a non-empty array of
// airlines that each have a slug and assets. Anything else, including an
// empty list, falls back to the bundled one.
export const isAirlineList = (data: unknown): data is Airline[] =>
  Array.isArray(data) &&
  data.length > 0 &&
  data.every((a) => typeof a?.slug === "string" && typeof a?.assets === "object" && a.assets !== null);

interface AssetTile {
  /** File name without .svg, e.g. "logo" or "logo-mono". */
  variant: string;
  url: string;
  /** Name for a downloaded copy, e.g. "korean-air-logo.svg" or "korean-air-1984-logo.svg". */
  fileName: string;
  /** A monochrome version, drawn in currentColor, which the extension tints. */
  mono: boolean;
}

// A tile for each file the airline ships: the color version and, when it
// exists, the -mono one (always there for single-color marks). With `mark`,
// the files of that older set from the airline's history.
export const getAssetTiles = (airline: Airline, mark?: HistoricalMarks): AssetTile[] =>
  ASSET_TYPES.flatMap((type) => {
    const info = (mark?.assets ?? airline.assets)[type];
    if (!info) return [];

    const tile = (variant: string, mono: boolean): AssetTile => ({
      variant,
      url: assetUrl(airline, variant, mark),
      fileName: [airline.slug, mark?.since, variant].filter(Boolean).join("-") + ".svg",
      mono,
    });
    const tiles: AssetTile[] = [];
    if (info.color) tiles.push(tile(type, false));
    if (info.mono) tiles.push(tile(`${type}-mono`, true));

    return tiles;
  });

// The marks the airline used before its current ones, newest first. Each
// was used from its `since` until the next one's, the newest until today's.
// Data from before 0.2.4 has no history.
export const earlierMarks = (airline: Airline): HistoricalMarks[] => [...(airline.history ?? [])].reverse();

// The title of an older mark: the years it was used ("1984–2025"), after the
// name on it when that was a former name ("T'way Air · 2010–2026"). Releases
// without `until` and `name` (0.2.4 and before) give the year it came in.
export const markTitle = (airline: Airline, mark: HistoricalMarks): string => {
  const years = mark.until ? `${mark.since}–${mark.until}` : `Introduced ${mark.since}`;

  return mark.name && mark.name !== airline.name ? `${mark.name} · ${years}` : years;
};

// The first file to show for a type: its color version, else its mono one
export const previewUrl = (airline: Airline, type: AssetType): string | undefined => {
  const info = airline.assets[type];
  if (!info) return undefined;

  return assetUrl(airline, info.color ? type : `${type}-mono`);
};
