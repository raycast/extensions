import timezoneBoundaryData from "./data/timezone-boundaries.json";
import type { ZoneResult } from "./types";

export type MapPreviewZone = Pick<
  ZoneResult,
  "label" | "timezone" | "time" | "date" | "isSource" | "isTarget"
>;
export type PreviewAppearance = "light" | "dark";

type Position = number[];

export interface TimezoneBoundaryCollection {
  type: "FeatureCollection";
  features: TimezoneBoundaryFeature[];
}

interface TimezoneBoundaryFeature {
  type: "Feature";
  properties: { tzid: string };
  geometry:
    | { type: "Polygon"; coordinates: Position[][] }
    | { type: "MultiPolygon"; coordinates: Position[][][] };
}

const DEFAULT_BOUNDARIES = timezoneBoundaryData as TimezoneBoundaryCollection;

const SVG_WIDTH = 960;
const SVG_HEIGHT = 540;
export const TIMEZONE_MAP_ASPECT_RATIO = "16/9";
const CARD_WIDTH = 480;
const CARD_HEIGHT = 270;
const MAP_X = 0;
const MAP_Y = 0;
const MAP_WIDTH = SVG_WIDTH;
const MAP_HEIGHT = SVG_HEIGHT;
const MIN_LAT = -70;
const MAX_LAT = 70;
const MAX_POINTS_PER_RING = 90;
const SVG_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

interface PreviewPalette {
  accent: string;
  border: string;
  cardBackground: string;
  cardBorder: string;
  cardDate: string;
  cardPrimary: string;
  cardSecondary: string;
  land: string;
  landBorder: string;
  target: string;
  targetBorder: string;
}

const PALETTES: Record<PreviewAppearance, PreviewPalette> = {
  dark: {
    accent: "#D97757",
    border: "#9F4C37",
    cardBackground: "#242422",
    cardBorder: "#44413C",
    cardDate: "#B8B1A8",
    cardPrimary: "#F2EEE8",
    cardSecondary: "#C8C0B6",
    land: "#C2BAB0",
    landBorder: "#EEE9E2",
    target: "#527FBF",
    targetBorder: "#315D99",
  },
  light: {
    accent: "#C85F3C",
    border: "#9D4428",
    cardBackground: "#FFFFFF",
    cardBorder: "#D6D1CA",
    cardDate: "#6F6860",
    cardPrimary: "#171714",
    cardSecondary: "#5E574F",
    land: "#D4CEC5",
    landBorder: "#F7F4EF",
    target: "#3F6FAF",
    targetBorder: "#2F5688",
  },
};

function paletteFor(appearance: PreviewAppearance): PreviewPalette {
  return PALETTES[appearance];
}

function formatTimezoneLabel(timezone: string): string {
  return timezone.replace(/_/g, " ");
}

const CITY_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  "America/Los_Angeles": { latitude: 34.0522, longitude: -118.2437 },
  "America/Denver": { latitude: 39.7392, longitude: -104.9903 },
  "America/Chicago": { latitude: 41.8781, longitude: -87.6298 },
  "America/New_York": { latitude: 40.7128, longitude: -74.006 },
  "America/Toronto": { latitude: 43.6532, longitude: -79.3832 },
  "America/Vancouver": { latitude: 49.2827, longitude: -123.1207 },
  "America/Sao_Paulo": { latitude: -23.5505, longitude: -46.6333 },
  "Europe/London": { latitude: 51.5074, longitude: -0.1278 },
  "Europe/Paris": { latitude: 48.8566, longitude: 2.3522 },
  "Europe/Berlin": { latitude: 52.52, longitude: 13.405 },
  "Europe/Budapest": { latitude: 47.4979, longitude: 19.0402 },
  "Europe/Madrid": { latitude: 40.4168, longitude: -3.7038 },
  "Europe/Rome": { latitude: 41.9028, longitude: 12.4964 },
  "Europe/Moscow": { latitude: 55.7558, longitude: 37.6173 },
  "Asia/Dubai": { latitude: 25.2048, longitude: 55.2708 },
  "Asia/Kolkata": { latitude: 19.076, longitude: 72.8777 },
  "Asia/Bangkok": { latitude: 13.7563, longitude: 100.5018 },
  "Asia/Hong_Kong": { latitude: 22.3193, longitude: 114.1694 },
  "Asia/Singapore": { latitude: 1.3521, longitude: 103.8198 },
  "Asia/Tokyo": { latitude: 35.6762, longitude: 139.6503 },
  "Australia/Sydney": { latitude: -33.8688, longitude: 151.2093 },
  "Pacific/Auckland": { latitude: -36.8485, longitude: 174.7633 },
  UTC: { latitude: 0, longitude: 0 },
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function round(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

function project(
  longitude: number,
  latitude: number,
): { x: number; y: number } {
  const clampedLat = Math.max(MIN_LAT, Math.min(MAX_LAT, latitude));
  const x = MAP_X + ((longitude + 180) / 360) * MAP_WIDTH;
  const y = MAP_Y + ((MAX_LAT - clampedLat) / (MAX_LAT - MIN_LAT)) * MAP_HEIGHT;
  return { x, y };
}

function ringsForFeature(feature: TimezoneBoundaryFeature): Position[][] {
  if (feature.geometry.type === "Polygon") return feature.geometry.coordinates;
  return feature.geometry.coordinates.flatMap((polygon) => polygon);
}

function simplifyRing(ring: Position[]): Position[] {
  if (ring.length <= MAX_POINTS_PER_RING) return ring;

  const step = Math.ceil((ring.length - 1) / MAX_POINTS_PER_RING);
  const simplified = ring.filter((_, index) => index % step === 0);
  const last = ring[ring.length - 1];
  if (simplified[simplified.length - 1] !== last) simplified.push(last);
  return simplified;
}

function pathForRing(ring: Position[]): string | undefined {
  const points = simplifyRing(ring).filter((coord) => coord.length >= 2);
  if (points.length < 3) return undefined;

  const commands = points
    .map((coord, index) => {
      const point = project(coord[0], coord[1]);
      return `${index === 0 ? "M" : "L"}${round(point.x)} ${round(point.y)}`;
    })
    .join(" ");

  return `${commands} Z`;
}

function offsetSet(zones: MapPreviewZone[], date: Date): Set<number> {
  return new Set(
    zones.map((zone) => getTimezoneOffsetMinutes(date, zone.timezone)),
  );
}

function featurePriority(
  tzid: string,
  zones: MapPreviewZone[],
  userOffsets: Set<number>,
  date: Date,
): number {
  const zone = zones.find((candidate) => candidate.timezone === tzid);
  if (zone?.isSource || zone?.isTarget) return 4;
  if (zone) return 3;

  try {
    return userOffsets.has(getTimezoneOffsetMinutes(date, tzid)) ? 1 : 0;
  } catch {
    return 0;
  }
}

function featureStyle(
  priority: number,
  palette: PreviewPalette,
  zone?: MapPreviewZone,
) {
  if (zone?.isSource) {
    return {
      fill: palette.accent,
      stroke: palette.border,
      opacity: "0.64",
      width: "1.2",
    };
  }
  if (zone?.isTarget) {
    return {
      fill: palette.target,
      stroke: palette.targetBorder,
      opacity: "0.58",
      width: "1.2",
    };
  }
  if (zone) {
    return {
      fill: palette.accent,
      stroke: palette.border,
      opacity: "0.42",
      width: "1",
    };
  }
  if (priority === 1) {
    return {
      fill: palette.accent,
      stroke: palette.border,
      opacity: "0.22",
      width: "0.45",
    };
  }
  return {
    fill: palette.land,
    stroke: palette.landBorder,
    opacity: "0.92",
    width: "0.35",
  };
}

function buildBoundaryPaths(
  zones: MapPreviewZone[],
  date: Date,
  boundaries: TimezoneBoundaryCollection,
  palette: PreviewPalette,
): string {
  const userOffsets = offsetSet(zones, date);
  const zoneByTimezone = new Map(zones.map((zone) => [zone.timezone, zone]));

  return boundaries.features
    .map((feature) => ({
      feature,
      priority: featurePriority(
        feature.properties.tzid,
        zones,
        userOffsets,
        date,
      ),
    }))
    .sort((a, b) => a.priority - b.priority)
    .flatMap(({ feature, priority }) => {
      const zone = zoneByTimezone.get(feature.properties.tzid);
      const style = featureStyle(priority, palette, zone);

      return ringsForFeature(feature)
        .map(pathForRing)
        .filter((path): path is string => Boolean(path))
        .map(
          (path) =>
            `<path data-tzid="${escapeXml(feature.properties.tzid)}" d="${path}" fill="${style.fill}" fill-opacity="${style.opacity}" stroke="${style.stroke}" stroke-width="${style.width}" />`,
        );
    })
    .join("\n");
}

function coordinatesForZone(
  zone: MapPreviewZone,
  date: Date,
  fallbackIndex: number,
): { latitude: number; longitude: number } {
  const known = CITY_COORDINATES[zone.timezone];
  if (known) return known;

  const offsetMinutes = getTimezoneOffsetMinutes(date, zone.timezone);
  const offsetLongitude = (offsetMinutes / 60) * 15;
  const fallbackLatitude = -32 + ((fallbackIndex * 23) % 84);
  return { latitude: fallbackLatitude, longitude: offsetLongitude };
}

function markerColor(zone: MapPreviewZone, palette: PreviewPalette): string {
  if (zone.isSource) return palette.accent;
  if (zone.isTarget) return palette.target;
  return palette.accent;
}

function buildMarkers(
  zones: MapPreviewZone[],
  date: Date,
  palette: PreviewPalette,
): string {
  return zones
    .map((zone, index) => {
      const coordinates = coordinatesForZone(zone, date, index);
      const point = project(coordinates.longitude, coordinates.latitude);
      const color = markerColor(zone, palette);
      const label = escapeXml(zone.label);
      const placeLeft = point.x > SVG_WIDTH - 260;
      const labelX = placeLeft
        ? Math.max(40, point.x - 10)
        : Math.min(SVG_WIDTH - 40, point.x + 9);
      const labelY = Math.max(
        MAP_Y + 18,
        Math.min(MAP_Y + MAP_HEIGHT - 8, point.y - 8),
      );
      const anchor = placeLeft ? "end" : "start";

      return `
        <g>
          <circle cx="${round(point.x)}" cy="${round(point.y)}" r="${zone.isSource || zone.isTarget ? 5.8 : 4.8}" fill="${color}" stroke="#FFFFFF" stroke-width="2.2" />
          <text x="${round(labelX)}" y="${round(labelY)}" text-anchor="${anchor}" font-size="12" font-weight="700" fill="#1A1A17" stroke="#F7F4EF" stroke-width="4" paint-order="stroke">${label}</text>
        </g>
      `;
    })
    .join("\n");
}

export function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) => {
    const part = parts.find((candidate) => candidate.type === type);
    if (!part) throw new Error(`Missing ${type} for ${timezone}`);
    return parseInt(part.value, 10);
  };

  const localAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
  );

  return Math.round((localAsUtc - date.getTime()) / 60_000);
}

export function formatOffsetLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";

  const sign = offsetMinutes > 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  return minutes === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

export function buildTimezoneMapSvg(
  zones: MapPreviewZone[],
  date: Date,
  boundaries: TimezoneBoundaryCollection = DEFAULT_BOUNDARIES,
  appearance: PreviewAppearance = "dark",
): string {
  const palette = paletteFor(appearance);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img">
  <g>
    ${buildBoundaryPaths(zones, date, boundaries, palette)}
    ${buildMarkers(zones, date, palette)}
  </g>
</svg>`;
}

export function buildMapSignature(svg: string): string {
  let hash = 5381;
  for (let index = 0; index < svg.length; index += 1) {
    hash = (hash * 33) ^ svg.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function buildMapFilename(signature: string): string {
  return `timezoner-map-${signature}.svg`;
}

export function buildSvgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function buildZoneCardSvg(
  zone: MapPreviewZone,
  appearance: PreviewAppearance = "dark",
): string {
  const palette = paletteFor(appearance);
  const label = escapeXml(zone.label);
  const time = escapeXml(zone.time);
  const date = escapeXml(zone.date);
  const timezone = escapeXml(formatTimezoneLabel(zone.timezone));
  const border = zone.isSource
    ? palette.accent
    : zone.isTarget
      ? palette.target
      : palette.cardBorder;
  const borderWidth = zone.isSource || zone.isTarget ? "3" : "1";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img">
  <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${palette.cardBackground}" />
  <rect x="1.5" y="1.5" width="${CARD_WIDTH - 3}" height="${CARD_HEIGHT - 3}" rx="8" fill="none" stroke="${border}" stroke-width="${borderWidth}" />
  <text x="34" y="58" font-family="${SVG_FONT_FAMILY}" font-size="34" font-weight="700" fill="${palette.cardPrimary}">${label}</text>
  <text x="34" y="92" font-family="${SVG_FONT_FAMILY}" font-size="21" font-weight="560" fill="${palette.cardSecondary}">${timezone}</text>
  <text x="34" y="166" font-family="${SVG_FONT_FAMILY}" font-size="58" font-weight="720" fill="${palette.cardPrimary}">${time}</text>
  <text x="34" y="222" font-family="${SVG_FONT_FAMILY}" font-size="25" font-weight="560" fill="${palette.cardDate}">${date}</text>
</svg>`;
}

export function buildZoneCardFilename(
  timezone: string,
  signature: string,
): string {
  const safeTimezone = timezone
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `timezoner-card-${safeTimezone}-${signature}.svg`;
}

export function buildMapDetailMarkdown(
  mapImageUrl: string | undefined,
  _selectedZone: MapPreviewZone,
  _zones: MapPreviewZone[],
  _date: Date,
  error?: string,
): string {
  const imageMarkdown = mapImageUrl
    ? `![Timezone map](${mapImageUrl})`
    : "_Preparing map preview..._";
  const errorMarkdown = error ? `\n\n_Map preview file error: ${error}_` : "";

  return `${imageMarkdown}${errorMarkdown}`;
}
