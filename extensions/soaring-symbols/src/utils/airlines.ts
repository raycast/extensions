import type { Airline, Alliance, AllianceAssetType, AssetType, HistoricalMarks } from "soaring-symbols";

// The npm release line the extension reads, served by jsDelivr. Every 0.5.x
// release (new airlines, fixed SVGs) arrives without a store update; a
// breaking 0.6.0 never does. Move this, and the soaring-symbols dependency,
// to the next line in the same extension update.
export const DATA_LINE = "0.5";

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

// The mark types, in grid order. logo-stacked, an airline's vertical lockup
// beside its horizontal logo, came in the 0.5 line; spelled out as strings
// until the bundled dependency's AssetType has it.
const ASSET_TYPES = ["logo", "logo-stacked", "icon", "tail"] as const;

// The names a renamed airline flew under before, oldest first (T'way Air
// for Trinity Airways); `former` also lists codes that changed on their own
export const formerNames = (airline: Airline): string[] =>
  (airline.former ?? []).flatMap((item) => (item.name ? [item.name] : []));

// The other names an airline goes by beside its full one (SWISS for Swiss
// International Air Lines). `aliases` came in the 0.5 line; the type is
// spelled out until the bundled dependency moves there.
type WithAliases = Airline & { aliases?: readonly { name: string }[] };
export const aliasNames = (airline: WithAliases): string[] => (airline.aliases ?? []).map((alias) => alias.name);

// What both commands search: name, codes, slug, callsign, aliases and former
// names
export const searchKeywords = (airline: Airline): string[] =>
  [
    airline.name,
    airline.iata,
    airline.icao,
    airline.slug,
    airline.callsign,
    ...aliasNames(airline),
    ...formerNames(airline),
    // Typing "cargo" lists the cargo airlines and brands
    airline.cargo ? "cargo" : undefined,
  ].filter((k): k is string => Boolean(k));

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
  /**
   * On a color tile, the type's -dark.svg for dark backgrounds, when the
   * data ships one (from 0.5.0), offered to copy and download.
   */
  dark?: { url: string; fileName: string };
}

// A tile for each file of the given types: the color version, with its
// -dark one when it exists, and the -mono one. `url` and `fileName` take the
// variant, e.g. "logo-mono".
const tilesFor = (
  types: readonly string[],
  assets: Partial<Record<string, { color?: boolean; mono?: boolean; dark?: boolean }>>,
  url: (variant: string) => string,
  fileName: (variant: string) => string,
): AssetTile[] =>
  types.flatMap((type) => {
    const info = assets[type];
    if (!info) return [];
    const dark = info.dark ? { url: url(`${type}-dark`), fileName: fileName(`${type}-dark`) } : undefined;

    return [...(info.color ? [type] : []), ...(info.mono ? [`${type}-mono`] : [])].map((variant) => ({
      variant,
      url: url(variant),
      fileName: fileName(variant),
      mono: variant !== type,
      ...(variant === type && dark ? { dark } : {}),
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

// A tile's mark type and kind, from its variant: "logo-stacked-mono" is the
// Logo Stacked type's Monochrome file
const KINDS = [
  { suffix: "-mono", title: "Monochrome" },
  { suffix: "-dark", title: "Dark Background" },
] as const;

const typeTitle = (type: string) =>
  type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const tileKind = (variant: string): { type: string; title: string } => {
  const kind = KINDS.find(({ suffix }) => variant.endsWith(suffix));

  return kind ? { type: variant.slice(0, -kind.suffix.length), title: kind.title } : { type: variant, title: "Color" };
};

// One section per mark type, in the order the tiles come in (logo, stacked
// logo, icon, tail), as the website's rows: the color file, the monochrome
// one and, with `dark`, the -dark.svg, each tile named by its kind. A type
// with no files has no section.
export const typeSections = (
  tiles: AssetTile[],
  { dark = false } = {},
): { key: string; title: string; tiles: AssetTile[] }[] => {
  const withDark = tiles.flatMap((tile) =>
    dark && tile.dark
      ? [tile, { variant: `${tile.variant}-dark`, url: tile.dark.url, fileName: tile.dark.fileName, mono: false }]
      : [tile],
  );
  const types = [...new Set(withDark.map((tile) => tileKind(tile.variant).type))];
  const order = (tile: AssetTile) => ["Color", "Monochrome", "Dark Background"].indexOf(tileKind(tile.variant).title);

  return types.map((type) => ({
    key: type,
    title: typeTitle(type),
    tiles: withDark.filter((tile) => tileKind(tile.variant).type === type).sort((a, b) => order(a) - order(b)),
  }));
};

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

// The first file to show for a type: its color version, else its mono one.
// With `dark` (Raycast in dark mode), its -dark.svg when the data ships one.
export const previewUrl = (airline: Airline, type: AssetType, { dark = false } = {}): string | undefined => {
  const info = airline.assets[type];
  if (!info) return undefined;
  if (dark && info.dark) return assetUrl(airline, `${type}-dark`);

  return assetUrl(airline, info.color ? type : `${type}-mono`);
};

// A file that follows Raycast's theme: one URL, or a light and a dark one
// that Raycast switches between by itself
export type ThemedSource = string | { light: string; dark: string };

export const themed = (light: string, dark?: string): ThemedSource => (dark ? { light, dark } : light);

// The preview as an image source that follows the theme: the -dark.svg in
// dark mode when the data ships one
export const previewSource = (airline: Airline, type: AssetType): ThemedSource | undefined => {
  const light = previewUrl(airline, type);

  return light && themed(light, airline.assets[type]?.dark ? previewUrl(airline, type, { dark: true }) : undefined);
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
