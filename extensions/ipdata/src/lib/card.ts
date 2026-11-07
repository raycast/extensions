// The record view: the seven enrichment rows of ipdata.co's enrichment section as a table, and a
// vector road map underneath, drawn as one SVG that Raycast (WebKit) renders from a data URI in the
// list pane's markdown.
import { environment } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { flagAsset } from "./flags";
import { IpRecord, LookupOk, RateInfo } from "./ipdata";
import { MapLayers, ROAD_CLASSES, RoadClass } from "./map";
import * as P from "./present";

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
  hasKey: boolean;
  map: MapLayers | null;
  mapStatus: MapStatus;
}

export interface PaneOptions extends MapOptions {
  rate?: RateInfo | null;
  chip?: boolean; // the city and coordinates label on the map (default on)
  footer?: boolean; // the tier and quota line under the map (default on)
  title?: boolean; // flag and "City, Country" above the map, in the UI font (default off)
  background?: boolean; // fill the map area with the map colour (default on); off draws over the pane
  frame?: boolean; // border and corner brackets around the map (default on)
}

interface Palette {
  panel: string;
  border: string;
  label: string;
  text: string;
  muted: string;
  accent: string;
  green: string;
  red: string;
  mapBg: string;
  mapRoad: string;
  mapRoadBare: string; // road colour when the map has no background fill
  mapWater: string;
  mapGreen: string;
  chip: string;
}

// Brand tokens from ipdata.co's variables.css; the map tones follow its "streets" (light) and
// "blueprint" (dark) palettes.
const LIGHT: Palette = {
  panel: "#FFFFFF",
  border: "#1A1A1A",
  label: "#64646B",
  text: "#1A1A1A",
  muted: "#9A9AA3",
  accent: "#3366FF",
  green: "#1E9E55",
  red: "#D23B3B",
  mapBg: "#DCE4FA",
  mapRoad: "#FFFFFF",
  mapRoadBare: "#8FA5E0",
  mapWater: "#B4C7F2",
  mapGreen: "#CBDFD3",
  chip: "#FFFFFF",
};
const DARK: Palette = {
  panel: "#141416",
  border: "#3C3C46",
  label: "#8E8E98",
  text: "#EDEDF0",
  muted: "#60606A",
  accent: "#5B8CFF",
  green: "#4CCB6A",
  red: "#FF6B6B",
  mapBg: "#121A2E",
  mapRoad: "#6A9FD8",
  mapRoadBare: "#6A9FD8",
  mapWater: "#3F86D1",
  mapGreen: "#3F9A5C",
  chip: "#141416",
};

const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, 'DM Mono', monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function flagInner(cc: string | null): string | null {
  const asset = flagAsset(cc);
  if (!asset) return null;
  try {
    const svg = fs.readFileSync(path.join(environment.assetsPath, asset), "utf8");
    const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
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

// ---- primitives ----------------------------------------------------------------------------

type Tone = "green" | "red" | "muted";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fit = (s: string, max: number) => (s.length > max ? s.slice(0, Math.max(0, max - 1)).trimEnd() + "…" : s);
const upper = (s: string) => s.toUpperCase();
const toneFill = (pal: Palette, tone?: Tone) =>
  tone === "green" ? pal.green : tone === "red" ? pal.red : tone === "muted" ? pal.muted : pal.text;

function text(x: number, y: number, s: string, size: number, fill: string, extra = ""): string {
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`;
}
// The section's corner brackets around a box.
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

function coordLabel(m: IpRecord): string {
  if (m.latitude == null || m.longitude == null) return "";
  const lat = `${Math.abs(m.latitude).toFixed(4)} ${m.latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(m.longitude).toFixed(4)} ${m.longitude >= 0 ? "E" : "W"}`;
  return `${lat} · ${lon}`;
}

// ---- the seven enrichment rows ------------------------------------------------------------

interface Seg {
  t: string;
  tone?: Tone;
}
interface Row {
  label: string;
  segs: Seg[];
  italic?: boolean;
}
// "no" is good news and reads green; "yes" is a signal and reads red.
const yn = (v: boolean | undefined | null): Seg =>
  v === true ? { t: "yes", tone: "red" } : v === false ? { t: "no", tone: "green" } : { t: "—", tone: "muted" };

function rowsFor(m: IpRecord, hasKey: boolean): Row[] {
  const place = P.placeOf(m);
  const coords = P.coordsText(m);
  const t = m.threat;
  const op = P.operatorOf(m);
  const locked = (label: string): Row => ({
    label,
    segs: [{ t: hasKey ? "not in this response" : "needs an api key", tone: "muted" }],
    italic: true,
  });
  const lists = Array.isArray(t?.blocklists) ? t.blocklists : [];
  const s = t?.scores ?? {};
  const carrier = m.carrier
    ? [m.carrier.name, m.carrier.mcc && `mcc ${m.carrier.mcc}`, m.carrier.mnc && `mnc ${m.carrier.mnc}`]
        .filter(Boolean)
        .join(" · ")
    : null;
  const scoreSegs: Seg[] = [];
  if (typeof s.trust_score === "number") {
    scoreSegs.push({ t: `trust ${s.trust_score}`, tone: s.trust_score >= 60 ? "green" : "red" });
  }
  if (typeof s.threat_score === "number")
    scoreSegs.push({ t: `${scoreSegs.length ? " · " : ""}threat ${s.threat_score}` });
  if (typeof s.vpn_score === "number") scoreSegs.push({ t: `${scoreSegs.length ? " · " : ""}vpn ${s.vpn_score}` });
  return [
    { label: "location", segs: [{ t: [place.short, coords].filter(Boolean).join(" · ") }] },
    t
      ? {
          label: "threat",
          segs: [
            { t: "attacker " },
            yn(t.is_known_attacker),
            { t: " · abuser " },
            yn(t.is_known_abuser),
            { t: " · bogon " },
            yn(t.is_bogon),
          ],
        }
      : locked("threat"),
    t
      ? {
          label: "blocklists",
          segs: lists.length
            ? [
                { t: `${lists.length} list${lists.length === 1 ? "" : "s"} · ` },
                { t: lists.map((b) => b.name || b.site || "unknown").join(", "), tone: "red" },
              ]
            : [{ t: "0 lists · " }, { t: "not listed", tone: "green" }],
        }
      : locked("blocklists"),
    { label: "network", segs: [{ t: [op.asn, op.name].filter(Boolean).join(" · ") || "unknown" }] },
    carrier
      ? { label: "carrier", segs: [{ t: carrier }] }
      : t
        ? { label: "carrier", segs: [{ t: "not a mobile network", tone: "muted" }], italic: true }
        : locked("carrier"),
    t
      ? {
          label: "vpn",
          segs: [{ t: "vpn " }, yn(t.is_vpn), { t: " · proxy " }, yn(t.is_proxy), { t: " · tor " }, yn(t.is_tor)],
        }
      : locked("vpn"),
    t ? { label: "score", segs: scoreSegs.length ? scoreSegs : [{ t: "no scores", tone: "muted" }] } : locked("score"),
  ];
}

// A row's value as one <text> with coloured spans, truncated to `max` characters overall.
function segsText(x: number, y: number, segs: Seg[], max: number, size: number, pal: Palette, italic: boolean): string {
  let used = 0;
  const parts: string[] = [];
  for (const seg of segs) {
    if (used >= max) break;
    let t = seg.t;
    if (used + t.length > max) t = t.slice(0, Math.max(0, max - used - 1)).trimEnd() + "…";
    used += t.length;
    parts.push(`<tspan fill="${toneFill(pal, seg.tone)}">${esc(t)}</tspan>`);
  }
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" ${italic ? 'font-style="italic"' : ""}>${parts.join("")}</text>`;
}

// The rows as table lines inside an already drawn box at (x, y, w); height is rows × rowH.
function rowsTable(
  x: number,
  y: number,
  w: number,
  rowH: number,
  rows: Row[],
  pal: Palette,
  labelW: number,
  size: number,
): string {
  const out: string[] = [];
  const valueX = x + labelW;
  const max = Math.floor((x + w - 12 - valueX) / (size * 0.605));
  rows.forEach((row, i) => {
    const ry = y + i * rowH;
    if (i) {
      out.push(
        `<line x1="${x}" y1="${ry}" x2="${x + w}" y2="${ry}" stroke="${pal.border}" stroke-width="1" opacity="0.35"/>`,
      );
    }
    out.push(text(x + 16, ry + rowH / 2 + 3, upper(row.label), 8, pal.label, 'letter-spacing="1"'));
    out.push(segsText(valueX, ry + rowH / 2 + 4, row.segs, max, size, pal, !!row.italic));
  });
  return out.join("");
}

// ---- the map ---------------------------------------------------------------------------------

// Map frame, layers, pin, label chip and attribution at (x, y, w, h). `clipId` must be unique per SVG.
function mapBlock(
  x: number,
  y: number,
  w: number,
  h: number,
  m: IpRecord,
  opts: MapOptions,
  pal: Palette,
  clipId: string,
  withBrackets: boolean,
  chip = true,
  background = true,
  frame = true,
): string {
  const out: string[] = [];
  const road = background ? pal.mapRoad : pal.mapRoadBare;
  if (background) out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${pal.mapBg}"/>`);
  if (opts.map) {
    const dark = opts.appearance === "dark";
    const g: string[] = [`<g clip-path="url(#${clipId})"><g transform="translate(${x} ${y})">`];
    if (opts.map.green)
      g.push(`<path d="${opts.map.green}" fill="${pal.mapGreen}" fill-rule="evenodd" opacity="${dark ? 0.3 : 0.9}"/>`);
    if (opts.map.water)
      g.push(`<path d="${opts.map.water}" fill="${pal.mapWater}" fill-rule="evenodd" opacity="${dark ? 0.35 : 1}"/>`);
    if (opts.map.rivers) {
      g.push(
        `<path d="${opts.map.rivers}" fill="none" stroke="${pal.mapWater}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="${dark ? 0.5 : 1}"/>`,
      );
    }
    for (const cls of [...ROAD_CLASSES].reverse()) {
      const d = opts.map.roads[cls];
      if (!d) continue;
      g.push(
        `<path d="${d}" fill="none" stroke="${road}" stroke-width="${ROAD_WIDTH[cls]}" stroke-opacity="${ROAD_OPACITY[cls]}" stroke-linecap="round" stroke-linejoin="round"/>`,
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
  if (frame) {
    out.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${pal.border}" stroke-width="1" opacity="0.6"/>`,
    );
    if (withBrackets) out.push(brackets(x, y, w, h, pal));
  }
  if (opts.map && m.latitude != null && m.longitude != null) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    out.push(
      `<circle cx="${cx}" cy="${cy}" r="11" fill="${pal.accent}" opacity="0.18"/>` +
        `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${pal.accent}" stroke="${pal.panel}" stroke-width="2"/>`,
    );
  }
  if (chip) {
    const cityName = m.city ?? m.region ?? m.country_name ?? "Unknown";
    const label = upper(
      [[cityName, m.country_code].filter(Boolean).join(", "), coordLabel(m)].filter(Boolean).join(" · "),
    );
    const labelW = Math.min(w - 24, 16 + label.length * 5.3);
    out.push(
      `<rect x="${x + 10}" y="${y + h - 30}" width="${labelW}" height="20" fill="${pal.chip}" stroke="${pal.border}" stroke-width="1"/>` +
        text(x + 18, y + h - 17, fit(label, Math.floor((labelW - 16) / 5.3)), 8, pal.text, 'letter-spacing="0.5"'),
    );
  }
  out.push(text(x + w - 6, y + h - 5, "© OpenStreetMap · ipdata", 6.5, pal.label, 'text-anchor="end"'));
  return out.join("");
}

// ---- the pane version: the seven rows and the map ---------------------------------------------

export function paneSvg(result: LookupOk, opts: PaneOptions): string {
  const pal = opts.appearance === "dark" ? DARK : LIGHT;
  const m = result.model;
  const rows = rowsFor(m, opts.hasKey);
  const x = 6;
  const w = PANE_W - 12;
  const rowH = 30;
  const tableY = 6;
  const tableH = rows.length * rowH;
  const mapY = tableY + tableH + 14;
  const footY = mapY + PANE_MAP_H + 18;
  const H = footY + 6;
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PANE_W}" height="${H}" viewBox="0 0 ${PANE_W} ${H}">`,
    `<defs><clipPath id="pmap"><rect x="${x}" y="${mapY}" width="${PANE_MAP_W}" height="${PANE_MAP_H}"/></clipPath></defs>`,
  );
  out.push(
    `<rect x="${x}" y="${tableY}" width="${w}" height="${tableH}" fill="${pal.panel}" stroke="${pal.border}" stroke-width="1"/>`,
  );
  out.push(rowsTable(x, tableY, w, rowH, rows, pal, 92, 10.5));
  out.push(mapBlock(x, mapY, PANE_MAP_W, PANE_MAP_H, m, opts, pal, "pmap", true));
  // Footer: the tier and, on the free tier, what is left of today's quota.
  const quota = result.source === "free" ? P.quotaText(opts.rate ?? result.rate) : null;
  const footer =
    result.source === "key"
      ? `api key · ${result.host}${m.count != null ? ` · ${m.count.toLocaleString("en-US")} requests in 24h` : ""}`
      : `free tier · ${result.host}${quota ? ` · ${quota} lookups left today` : ""}`;
  out.push(text(x, footY, upper(footer), 7.5, pal.label, 'letter-spacing="0.8"'));
  out.push("</svg>");
  return out.join("");
}

// The map alone (for a pane whose rows are plain markdown), with the tier and quota footer.
export function mapSvg(result: LookupOk, opts: PaneOptions): string {
  const pal = opts.appearance === "dark" ? DARK : LIGHT;
  const m = result.model;
  const x = 6;
  const titleH = opts.title ? 34 : 0;
  const mapY = 6 + titleH;
  const footY = mapY + PANE_MAP_H + 18;
  const H = opts.footer === false ? mapY + PANE_MAP_H + 6 : footY + 6;
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PANE_W}" height="${H}" viewBox="0 0 ${PANE_W} ${H}">`,
    `<defs><clipPath id="pmap"><rect x="${x}" y="${mapY}" width="${PANE_MAP_W}" height="${PANE_MAP_H}"/></clipPath></defs>`,
  );
  if (opts.title) {
    const flag = flagInner(m.country_code);
    const textX = flag ? x + 30 : x;
    if (flag) out.push(`<svg x="${x}" y="2" width="24" height="24" viewBox="0 0 36 36">${flag}</svg>`);
    out.push(
      `<text x="${textX}" y="20" font-family="${SANS}" font-size="17" font-weight="600" fill="${pal.text}">${esc(P.placeOf(m).short)}</text>`,
    );
  }
  out.push(
    mapBlock(
      x,
      mapY,
      PANE_MAP_W,
      PANE_MAP_H,
      m,
      opts,
      pal,
      "pmap",
      true,
      opts.chip !== false,
      opts.background !== false,
      opts.frame !== false,
    ),
  );
  if (opts.footer === false) {
    out.push("</svg>");
    return out.join("");
  }
  const quota = result.source === "free" ? P.quotaText(opts.rate ?? result.rate) : null;
  const footer =
    result.source === "key"
      ? `api key · ${result.host}${m.count != null ? ` · ${m.count.toLocaleString("en-US")} requests in 24h` : ""}`
      : `free tier · ${result.host}${quota ? ` · ${quota} lookups left today` : ""}`;
  out.push(text(x, footY, upper(footer), 7.5, pal.label, 'letter-spacing="0.8"'));
  out.push("</svg>");
  return out.join("");
}

// ---- the JSON pane: the raw response drawn as an image so the values can be blue -----------------

const JSON_FONT = 10.5;
const JSON_CHAR = 6.32; // advance of the UI monospace at 10.5px
const JSON_LINE = 15;

export function jsonSvg(raw: unknown, appearance: Appearance): string {
  const pal = appearance === "dark" ? DARK : LIGHT;
  const value = appearance === "dark" ? "#5B8CFF" : "#3366FF";
  const maxChars = Math.floor((PANE_W - 12) / JSON_CHAR);
  const text = JSON.stringify(raw, null, 2) ?? "";
  // Each source line becomes one or more drawn lines: [indent, key, value, trailer] with the value
  // wrapped onto continuation lines that align with where it started.
  const lines: { x: number; spans: { t: string; fill: string }[] }[] = [];
  for (const line of text.split("\n")) {
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
    // Wrap the value; continuation lines keep the value's left edge.
    let first = true;
    let s = rest;
    while (s.length) {
      const chunk = s.slice(0, room);
      s = s.slice(room);
      const last = s.length === 0;
      lines.push({
        x: first ? 6 : 6 + headLen * JSON_CHAR,
        spans: [...(first ? head : []), { t: chunk, fill: valueFill }, ...(last ? [{ t: comma, fill: pal.text }] : [])],
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
