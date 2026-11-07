// The drawn parts of the record view, rendered by Raycast from data-URI SVGs in markdown: the vector
// road map on the address row and the Raw JSON tab with blue values.
import { IpRecord } from "./ipdata";
import { MapLayers, ROAD_CLASSES, RoadClass } from "./map";

export const MAP_ZOOM = 13.1;
export const PANE_W = 420;
export const PANE_MAP_W = PANE_W - 12;
export const PANE_MAP_H = 160;

export type Appearance = "light" | "dark";
export type MapStatus = "loading" | "ready" | "unavailable" | "country";

// A street map only makes sense when the record is more precise than a country centroid.
export const hasStreetLevel = (m: IpRecord): boolean =>
  !!(m.city || m.region) && m.latitude != null && m.longitude != null;

export interface MapOptions {
  appearance: Appearance;
  map: MapLayers | null;
  mapStatus: MapStatus;
}

interface Palette {
  label: string;
  text: string;
  panel: string;
  border: string;
  accent: string;
  mapBg: string;
  mapRoad: string;
  mapWater: string;
  mapGreen: string;
}

// Brand tokens from ipdata.co; the map tones follow its "streets" (light) and "blueprint" (dark) palettes.
const LIGHT: Palette = {
  label: "#64646B",
  text: "#1A1A1A",
  panel: "#FFFFFF",
  border: "#1A1A1A",
  accent: "#3366FF",
  mapBg: "#DCE4FA",
  mapRoad: "#FFFFFF",
  mapWater: "#B4C7F2",
  mapGreen: "#CBDFD3",
};
const DARK: Palette = {
  label: "#8E8E98",
  text: "#EDEDF0",
  panel: "#141416",
  border: "#3C3C46",
  accent: "#5B8CFF",
  mapBg: "#121A2E",
  mapRoad: "#6A9FD8",
  mapWater: "#3F86D1",
  mapGreen: "#3F9A5C",
};

const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, 'DM Mono', monospace";
const ROAD_WIDTH: Record<RoadClass, number> = {
  motorway: 2.4,
  trunk: 2.0,
  primary: 1.5,
  secondary: 1.0,
  tertiary: 0.7,
};
const ROAD_OPACITY: Record<RoadClass, number> = {
  motorway: 1,
  trunk: 0.95,
  primary: 0.85,
  secondary: 0.7,
  tertiary: 0.5,
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function text(x: number, y: number, s: string, size: number, fill: string, extra = ""): string {
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`;
}

// Corner brackets around a box, as on ipdata.co.
function brackets(x: number, y: number, w: number, h: number, pal: Palette): string {
  const b = 7;
  const o = 4;
  const corner = (cx: number, cy: number, sx: number, sy: number) =>
    `<path d="M${cx + sx * b} ${cy}H${cx}V${cy + sy * b}" fill="none" stroke="${pal.text}" stroke-width="1.2"/>`;
  return (
    corner(x - o, y - o, 1, 1) +
    corner(x + w + o, y - o, -1, 1) +
    corner(x - o, y + h + o, 1, -1) +
    corner(x + w + o, y + h + o, -1, -1)
  );
}

// The map for the address row: landuse, water and roads over the map color, a frame, the pin and
// the attribution; a status line instead of the layers while loading or when there is no street map.
export function mapSvg(m: IpRecord, opts: MapOptions): string {
  const pal = opts.appearance === "dark" ? DARK : LIGHT;
  const dark = opts.appearance === "dark";
  const x = 6;
  const y = 6;
  const w = PANE_MAP_W;
  const h = PANE_MAP_H;
  const H = y + h + 6;
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PANE_W}" height="${H}" viewBox="0 0 ${PANE_W} ${H}">`,
    `<defs><clipPath id="pmap"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${pal.mapBg}"/>`,
  ];
  if (opts.map) {
    const g: string[] = [`<g clip-path="url(#pmap)"><g transform="translate(${x} ${y})">`];
    if (opts.map.green) {
      g.push(`<path d="${opts.map.green}" fill="${pal.mapGreen}" fill-rule="evenodd" opacity="${dark ? 0.3 : 0.9}"/>`);
    }
    if (opts.map.water) {
      g.push(`<path d="${opts.map.water}" fill="${pal.mapWater}" fill-rule="evenodd" opacity="${dark ? 0.35 : 1}"/>`);
    }
    if (opts.map.rivers) {
      g.push(
        `<path d="${opts.map.rivers}" fill="none" stroke="${pal.mapWater}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="${dark ? 0.5 : 1}"/>`,
      );
    }
    for (const cls of [...ROAD_CLASSES].reverse()) {
      const d = opts.map.roads[cls];
      if (!d) continue;
      g.push(
        `<path d="${d}" fill="none" stroke="${pal.mapRoad}" stroke-width="${ROAD_WIDTH[cls]}" stroke-opacity="${ROAD_OPACITY[cls]}" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    }
    g.push("</g></g>");
    out.push(g.join(""));
  } else {
    const msg =
      opts.mapStatus === "loading"
        ? "LOADING MAP…"
        : opts.mapStatus === "country"
          ? "COUNTRY-LEVEL LOCATION · NO STREET MAP"
          : m.latitude == null
            ? "NO COORDINATES"
            : "MAP UNAVAILABLE";
    out.push(text(x + w / 2, y + h / 2 + 3, msg, 9, pal.label, 'text-anchor="middle" letter-spacing="1.2"'));
  }
  out.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${pal.border}" stroke-width="1" opacity="0.6"/>`,
    brackets(x, y, w, h, pal),
  );
  if (opts.map && m.latitude != null && m.longitude != null) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    out.push(
      `<circle cx="${cx}" cy="${cy}" r="11" fill="${pal.accent}" opacity="0.18"/>` +
        `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${pal.accent}" stroke="${pal.panel}" stroke-width="2"/>`,
    );
  }
  out.push(text(x + w - 6, y + h - 5, "© OpenStreetMap · ipdata", 6.5, pal.label, 'text-anchor="end"'), "</svg>");
  return out.join("");
}

// ---- the Raw JSON tab: the response drawn so the values can be blue (Raycast fixes code-block colors) ---

const JSON_FONT = 10.5;
const JSON_CHAR = 6.32; // advance of the UI monospace at 10.5px
const JSON_LINE = 15;

export function jsonSvg(raw: unknown, appearance: Appearance): string {
  const pal = appearance === "dark" ? DARK : LIGHT;
  const value = pal.accent;
  const maxChars = Math.floor((PANE_W - 12) / JSON_CHAR);
  const source = JSON.stringify(raw, null, 2) ?? "";
  // Each source line becomes one or more drawn lines: indent, key, value and trailing comma, with a long
  // value wrapped onto continuation lines that align with where it started.
  const lines: { x: number; spans: { t: string; fill: string }[] }[] = [];
  for (const line of source.split("\n")) {
    const m = line.match(/^(\s*)(?:("(?:[^"\\]|\\.)*")(:\s*))?(.*?)(,?)$/);
    if (!m) continue;
    const [, indent, key = "", colon = "", rest, comma] = m;
    const structural = /^[{}[\]]$/.test(rest) || rest === "";
    const head = [
      indent ? { t: indent, fill: pal.text } : null,
      key ? { t: key, fill: pal.label } : null,
      colon ? { t: colon, fill: pal.text } : null,
    ].filter(Boolean) as { t: string; fill: string }[];
    const headLen = indent.length + key.length + colon.length;
    const room = Math.max(8, maxChars - headLen);
    const valueFill = structural ? pal.text : value;
    if (rest.length + comma.length <= room) {
      lines.push({ x: 6, spans: [...head, { t: rest, fill: valueFill }, { t: comma, fill: pal.text }] });
      continue;
    }
    let first = true;
    let s = rest;
    while (s.length) {
      const chunk = s.slice(0, room);
      s = s.slice(room);
      lines.push({
        x: first ? 6 : 6 + headLen * JSON_CHAR,
        spans: [
          ...(first ? head : []),
          { t: chunk, fill: valueFill },
          ...(s.length === 0 ? [{ t: comma, fill: pal.text }] : []),
        ],
      });
      first = false;
    }
  }
  const H = lines.length * JSON_LINE + 12;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${PANE_W}" height="${H}" viewBox="0 0 ${PANE_W} ${H}">`];
  lines.forEach((l, i) => {
    const y = 6 + (i + 1) * JSON_LINE - 4;
    const spans = l.spans.map((sp) => `<tspan fill="${sp.fill}">${esc(sp.t)}</tspan>`).join("");
    out.push(
      `<text x="${l.x}" y="${y}" font-family="${MONO}" font-size="${JSON_FONT}" xml:space="preserve">${spans}</text>`,
    );
  });
  out.push("</svg>");
  return out.join("");
}

export function cardMarkdown(svg: string): string {
  return `![ipdata record card](data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")})`;
}
