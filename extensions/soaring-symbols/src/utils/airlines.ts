import type { Airline, Alliance, AllianceAssetType, AssetType, HistoricalMarks } from "soaring-symbols";

// The npm release line the extension reads, served by jsDelivr. Every 0.4.x
// release (new airlines, fixed SVGs) arrives without a store update; a
// breaking 0.5.0 never does. Move this, and the soaring-symbols dependency,
// to the next line in the same extension update.
const DATA_LINE = "0.4";

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

// A data file from `release`, or from the line when it's unknown
const listUrl = (file: string, release?: string) => `${cdnBase(isLineRelease(release) ? release : DATA_LINE)}/${file}`;

export const airlinesUrl = (release?: string) => listUrl("airlines.json", release);
export const alliancesUrl = (release?: string) => listUrl("alliances.json", release);

// A file of the release the data came from, e.g. "alliances/skyteam/icon.svg"
export const dataFileUrl = (file: string) => `${cdnBase(dataVersion)}/${file}`;

const ASSET_TYPES: AssetType[] = ["logo", "icon", "tail"];

// The names a renamed airline flew under before, oldest first (T'way Air
// for Trinity Airways); `former` also lists codes that changed on their own
export const formerNames = (airline: Airline): string[] =>
  (airline.former ?? []).flatMap((item) => (item.name ? [item.name] : []));

// What both commands search: name, codes, slug, callsign and former names
export const searchKeywords = (airline: Airline): string[] =>
  [airline.name, airline.iata, airline.icao, airline.slug, airline.callsign, ...formerNames(airline)].filter(
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
  dataFileUrl(`assets/${airline.slug}${mark ? `/history/${mark.since}` : ""}/${file}.svg`);

// Whether fetched JSON is a usable airline list: a non-empty array of
// airlines that each have a slug and assets. Anything else, including an
// empty list, falls back to the bundled one.
export const isAirlineList = (data: unknown): data is Airline[] =>
  Array.isArray(data) &&
  data.length > 0 &&
  data.every((a) => typeof a?.slug === "string" && typeof a?.assets === "object" && a.assets !== null);

export interface AssetTile {
  /** File name without .svg, e.g. "logo" or "logo-mono". */
  variant: string;
  url: string;
  /** Name for a downloaded copy, e.g. "korean-air-logo.svg" or "korean-air-1984-logo.svg". */
  fileName: string;
  /** A monochrome version, drawn in currentColor, which the extension tints. */
  mono: boolean;
}

// A tile for each file of the given types: the color version and, when it
// exists, the -mono one. `url` and `fileName` take the variant, e.g.
// "logo-mono".
const tilesFor = (
  types: readonly string[],
  assets: Partial<Record<string, { color?: boolean; mono?: boolean }>>,
  url: (variant: string) => string,
  fileName: (variant: string) => string,
): AssetTile[] =>
  types.flatMap((type) => {
    const info = assets[type];
    if (!info) return [];

    return [...(info.color ? [type] : []), ...(info.mono ? [`${type}-mono`] : [])].map((variant) => ({
      variant,
      url: url(variant),
      fileName: fileName(variant),
      mono: variant !== type,
    }));
  });

// A tile for each file the airline ships (a -mono one is always there for
// single-color marks). With `mark`, the files of that older set from the
// airline's history.
export const getAssetTiles = (airline: Airline, mark?: HistoricalMarks): AssetTile[] =>
  tilesFor(
    ASSET_TYPES,
    mark?.assets ?? airline.assets,
    (variant) => assetUrl(airline, variant, mark),
    (variant) => [airline.slug, mark?.since, variant].filter(Boolean).join("-") + ".svg",
  );

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

// --- Alliances ---
// An alliance's marks, the icon first: alliances show their symbol far more
// often than a logo with their name. They have no tail.
const MARK_TYPES: AllianceAssetType[] = ["icon", "logo"];

// Whether fetched JSON is a usable alliance list: a non-empty array of
// alliances that each have a name, a slug and assets (empty until the
// collection has their marks)
export const isAllianceList = (data: unknown): data is Alliance[] =>
  Array.isArray(data) &&
  data.length > 0 &&
  data.every(
    (a) =>
      typeof a?.name === "string" && typeof a?.slug === "string" && typeof a?.assets === "object" && a.assets !== null,
  );

// A tile for each file the alliance ships, as for an airline
export const allianceTiles = (alliance: Alliance): AssetTile[] =>
  tilesFor(
    MARK_TYPES,
    alliance.assets,
    (variant) => dataFileUrl(`alliances/${alliance.slug}/${variant}.svg`),
    (variant) => `${alliance.slug}-${variant}.svg`,
  );

// The mark shown beside an alliance's name: its icon, else its logo, color
// before mono; undefined while the collection has neither
export const allianceMark = (alliance?: Alliance): AssetTile | undefined =>
  alliance ? allianceTiles(alliance)[0] : undefined;

// Whether the airline is in the alliance: a member now, or one that was a
// member when it ceased. A disbanded alliance has no members left, so it
// counts every airline that flew in it (Scoot in Value Alliance).
export const isMemberOf = (airline: Airline, alliance: Alliance): boolean =>
  airline.alliance === alliance.name ||
  (Boolean(alliance.defunct) && (airline.alliance_history ?? []).some((item) => item.alliance === alliance.name));

// What Browse Alliances counts for an alliance, as the website's alliance
// cards do: its airlines in the collection still flying in it, or for a
// disbanded alliance every one that flew in it. Never the alliance's own
// member count, which the collection doesn't track.
export const allianceCount = (alliance: Alliance, airlines: Airline[]): string => {
  const members = airlines.filter((airline) => isMemberOf(airline, alliance));
  if (alliance.defunct) return `${members.length} flew in it`;

  return `${members.filter((airline) => !airline.defunct).length} in the collection`;
};

// The countries a flag carrier flies the flag of: each one in
// `flag_carrier_countries` for a joint flag carrier (Scandinavian Airlines),
// else its own country
export const flagCarrierCountries = (airline: Pick<Airline, "country" | "flag_carrier_countries">): readonly string[] =>
  airline.flag_carrier_countries ?? [airline.country];

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// The English name of a country code ("SE" is Sweden), or the code itself
// for one Intl doesn't know, such as a subdivision like "GB-SCT"
export const countryName = (code: string): string => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};
