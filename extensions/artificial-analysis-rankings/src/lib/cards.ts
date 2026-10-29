import type { Verdict } from "./compare";
import { familyName } from "./families";
import type { RankedModel } from "./models";
import { providerInitials } from "./providers";

export type Appearance = "light" | "dark";

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeXml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!,
  );
}

function palette(theme: Appearance) {
  return theme === "dark"
    ? {
        background: "#1e2127",
        backgroundEnd: "#24282f",
        border: "#30353e",
        text: "#f3f5f8",
        muted: "#9aa3b2",
        accent: "#7cc4ff",
        monogram: "#363c47",
        cell: "rgba(148,163,184,0.09)",
      }
    : {
        background: "#ffffff",
        backgroundEnd: "#f6f7f9",
        border: "#dfe3e8",
        text: "#151a23",
        muted: "#5d6878",
        accent: "#0b6bcb",
        monogram: "#e4e8ee",
        cell: "#f0f3f7",
      };
}

/** Filled gold, silver, and bronze pills for the podium; an outlined pill for everyone else. */
function rankColors(rank: number, theme: Appearance): { fill: string; text: string; stroke?: string } {
  const dark = theme === "dark";
  switch (rank) {
    case 1:
      return dark ? { fill: "rgba(250,204,21,0.18)", text: "#fcd34d" } : { fill: "#fef3c7", text: "#a16207" };
    case 2:
      return dark ? { fill: "rgba(226,232,240,0.2)", text: "#e2e8f0" } : { fill: "#e2e8f0", text: "#334155" };
    case 3:
      return dark ? { fill: "rgba(251,146,60,0.18)", text: "#fdba74" } : { fill: "#ffedd5", text: "#c2410c" };
    default:
      return { fill: "none", text: palette(theme).muted, stroke: palette(theme).border };
  }
}

/** A 360-unit-wide card with the shared background; rendered at 2x for crisp text. */
function frame(theme: Appearance, body: string, height = 202.5): string {
  const p = palette(theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${height * 2}" viewBox="0 0 360 ${height}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.background}"/><stop offset="1" stop-color="${p.backgroundEnd}"/></linearGradient></defs>
<rect x="1" y="1" width="358" height="${height - 2}" rx="18" fill="url(#bg)" stroke="${p.border}" stroke-width="1.5"/>
${body}
</svg>`;
}

/** Places a provider logo SVG inside a card, stripping its own size so it scales into the given box. */
function embedLogo(logo: string, x: number, y: number, size: number): string {
  return logo
    .replace(/<\?xml[^>]*>/g, "")
    .replace(
      /<svg\b([^>]*)>/,
      (_match, attributes: string) =>
        `<svg${attributes.replace(/\s(?:width|height|x|y)="[^"]*"/g, "")} x="${x}" y="${y}" width="${size}" height="${size}">`,
    );
}

function truncate(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

/** The largest font size, up to `preferred`, at which `text` fits in `width` units. */
function fitFont(text: string, width: number, preferred: number, charWidth = 0.6): number {
  return Math.max(10, Math.min(preferred, Math.floor(width / (Math.max(text.length, 1) * charWidth))));
}

function labelLines(text: string, maxChars: number, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines = [""];
  for (const word of words) {
    const index = lines.length - 1;
    const next = `${lines[index]} ${word}`.trim();
    if (next.length <= maxChars) lines[index] = next;
    else if (lines.length < maxLines && lines[index]) lines.push(word);
    else {
      lines[index] = truncate(next, maxChars - 1);
      break;
    }
  }
  return lines;
}

export function monogramSvg(creator: string, theme: Appearance): string {
  const p = palette(theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${p.monogram}"/><text x="32" y="41" text-anchor="middle" font-family="${FONT}" font-size="25" font-weight="700" fill="${p.text}">${escapeXml(providerInitials(creator))}</text></svg>`;
}

/** Line icons on a 24-unit grid, drawn in the tile's color. */
const TILE_ICONS = {
  coding: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  speed: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  latency: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4M12 2v3"/>',
  price:
    '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 1.4 1.3 1.8 2.8 2.1s2.8.8 2.8 2.2c0 1.3-1.2 2.1-2.8 2.1-1.3 0-2.3-.5-2.8-1.4M12 6v1.8M12 16.2V18"/>',
  favorites: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  compare:
    '<rect x="3" y="4" width="7.5" height="16" rx="1.8"/><rect x="13.5" y="4" width="7.5" height="16" rx="1.8"/>',
} as const;

export type TileIcon = keyof typeof TILE_ICONS;

const TILE_COLORS: Record<TileIcon, { dark: string; light: string }> = {
  coding: { dark: "#c084fc", light: "#9333ea" },
  speed: { dark: "#fb923c", light: "#ea580c" },
  latency: { dark: "#f472b6", light: "#db2777" },
  price: { dark: "#4ade80", light: "#16a34a" },
  favorites: { dark: "#facc15", light: "#ca8a04" },
  compare: { dark: "#2dd4bf", light: "#0d9488" },
};

function icon(name: TileIcon, color: string, x: number, y: number, size: number): string {
  const filled = name === "favorites";
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? color : "none"}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TILE_ICONS[name]}</svg>`;
}

/** A dashboard card: provider logo, rank pill, family name, and the headline score with its label. */
export function modelCardSvg(
  model: RankedModel,
  theme: Appearance,
  logo: string,
  score: { value: string; label: string },
): string {
  const p = palette(theme);
  const rank = rankColors(model.rank, theme);
  const embedded = embedLogo(logo, 20, 18, 32);
  const rankText = `#${model.rank}`;
  const pillWidth = 22 + rankText.length * 11;
  const lines = labelLines(familyName(model.name), 24);
  return frame(
    theme,
    `<g fill="${p.text}" color="${p.text}">${embedded}</g>
<rect x="${340 - pillWidth}" y="19" width="${pillWidth}" height="30" rx="15" fill="${rank.fill}"${rank.stroke ? ` stroke="${rank.stroke}" stroke-width="1.5"` : ""}/>
<text x="${340 - pillWidth / 2}" y="40" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" fill="${rank.text}">${escapeXml(rankText)}</text>
${lines.map((line, index) => `<text x="20" y="${88 + index * 27}" font-family="${FONT}" font-size="23" font-weight="600" fill="${p.text}">${escapeXml(line)}</text>`).join("\n")}
<text x="18" y="180" font-family="${FONT}" font-size="54" font-weight="700" letter-spacing="-1.5" fill="${p.accent}">${escapeXml(score.value)}</text>
<text x="340" y="177" text-anchor="end" font-family="${FONT}" font-size="17" font-weight="500" fill="${p.muted}">${escapeXml(score.label)}</text>`,
  );
}

/** The card that completes the top-five grid and opens the full leaderboard. */
export function browseCardSvg(count: number, theme: Appearance): string {
  const p = palette(theme);
  return frame(
    theme,
    `<g fill="none" stroke="${p.accent}" stroke-width="3.5" stroke-linecap="round">
<path d="M22 28h6m8 0h22M22 40h6m8 0h22M22 52h6m8 0h22"/>
<path d="M306 168h30m-12-12 12 12-12 12" stroke-linejoin="round"/>
</g>
<text x="20" y="114" font-family="${FONT}" font-size="25" font-weight="600" fill="${p.text}">All ${count} models</text>
<text x="20" y="142" font-family="${FONT}" font-size="17" fill="${p.muted}">Browse the full leaderboard</text>`,
  );
}

/** A small square dashboard shortcut: a large colored icon on a tinted tile. Its name is the grid caption. */
export function leaderboardTileSvg(name: TileIcon, theme: Appearance): string {
  const color = TILE_COLORS[name][theme];
  return frame(
    theme,
    `<rect x="1" y="1" width="358" height="358" rx="18" fill="${color}" fill-opacity="${theme === "dark" ? 0.16 : 0.12}"/>
${icon(name, color, 80, 80, 200)}`,
    360,
  );
}

/** A square search result for adding a model to the comparison: provider logo, name, and configuration. */
export function modelTileSvg(
  tile: { name: string; detail: string; logo: string; added: boolean },
  theme: Appearance,
): string {
  const p = palette(theme);
  const green = TILE_COLORS.price[theme];
  const lines = labelLines(tile.name, 14);
  const check = tile.added
    ? `<circle cx="258" cy="48" r="26" fill="${green}"/><path d="m246 48 8 8 15-16" fill="none" stroke="${theme === "dark" ? "#0b1410" : "#ffffff"}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
    : "";
  return frame(
    theme,
    `<rect x="105" y="30" width="150" height="150" rx="40" fill="${p.cell}"/>
<g fill="${p.text}" color="${p.text}">${embedLogo(tile.logo, 135, 60, 90)}</g>
${check}
${lines.map((line, index) => `<text x="180" y="${(lines.length === 2 ? 246 : 266) + index * 44}" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="700" fill="${p.text}">${escapeXml(line)}</text>`).join("\n")}
<text x="180" y="334" text-anchor="middle" font-family="${FONT}" font-size="${fitFont(tile.detail, 320, 32, 0.55)}" fill="${tile.added ? green : p.muted}">${escapeXml(truncate(tile.detail, 22))}</text>`,
    360,
  );
}

export type ComparisonShape = "wide" | "portrait" | "tall";

export interface ComparisonValue {
  label: string;
  value: string;
  verdict: Verdict;
}

export interface ComparisonCard {
  name: string;
  configuration: string;
  logo: string;
  values: ComparisonValue[];
}

/**
 * Positions in card units (cards are 360 wide). Two models get wide cards, three get portrait cards, and four get
 * tall ones, so the comparison always fills the window.
 */
const COMPARISON_LAYOUTS: Record<
  ComparisonShape,
  {
    height: number;
    margin: number;
    /** A wide card puts the name beside the logo; taller cards stack it below. */
    inlineHeader: boolean;
    logo: number;
    nameSize: number;
    nameChars: number;
    lineGap: number;
    /** Baseline of the name's last line; stacked names grow upward so they sit just above the provider line. */
    nameBottom: number;
    configSize: number;
    configChars: number;
    /** Top of the first metric tile. */
    top: number;
    gap: number;
    /** Metric tiles per row: two stacked tiles, or one inline tile in tall cards. */
    columns: number;
    labelSize: number;
    valueSize: number;
    /** Space between a stacked tile's edge and its text. */
    padding: number;
  }
> = {
  wide: {
    height: 270,
    margin: 20,
    inlineHeader: true,
    logo: 40,
    nameSize: 28,
    nameChars: 17,
    lineGap: 0,
    nameBottom: 46,
    configSize: 15,
    configChars: 32,
    top: 88,
    gap: 8,
    columns: 2,
    labelSize: 13,
    valueSize: 27,
    padding: 5,
  },
  portrait: {
    height: 480,
    margin: 22,
    inlineHeader: false,
    logo: 40,
    nameSize: 28,
    nameChars: 20,
    lineGap: 32,
    nameBottom: 132,
    configSize: 16,
    configChars: 34,
    top: 186,
    gap: 10,
    columns: 2,
    labelSize: 16,
    valueSize: 36,
    padding: 10,
  },
  tall: {
    height: 640,
    margin: 24,
    inlineHeader: false,
    logo: 44,
    nameSize: 30,
    nameChars: 18,
    lineGap: 34,
    nameBottom: 146,
    configSize: 18,
    configChars: 30,
    top: 206,
    gap: 8,
    columns: 1,
    labelSize: 19,
    valueSize: 34,
    padding: 10,
  },
};

function verdictColors(verdict: Verdict, theme: Appearance): { fill: string; text: string } {
  const p = palette(theme);
  const dark = theme === "dark";
  switch (verdict) {
    case "best":
      return dark ? { fill: "rgba(74,222,128,0.16)", text: "#4ade80" } : { fill: "#dcfce7", text: "#15803d" };
    case "worst":
      return dark ? { fill: "rgba(248,113,113,0.16)", text: "#f87171" } : { fill: "#fee2e2", text: "#b91c1c" };
    case "missing":
      return { fill: p.cell, text: p.muted };
    default:
      return { fill: p.cell, text: p.text };
  }
}

/**
 * A model's column in the side-by-side comparison: a large heading, then every metric in a colored tile at the
 * same position as in the other cards, so values line up across columns.
 */
export function comparisonCardSvg(card: ComparisonCard, theme: Appearance, shape: ComparisonShape): string {
  const p = palette(theme);
  const layout = COMPARISON_LAYOUTS[shape];
  const { margin, columns, gap, top } = layout;
  const textX = layout.inlineHeader ? margin + layout.logo + 12 : margin;
  const lines = layout.inlineHeader ? [truncate(card.name, layout.nameChars)] : labelLines(card.name, layout.nameChars);
  const configY = layout.inlineHeader ? layout.nameBottom + 22 : layout.nameBottom + layout.configSize + 12;
  const header = `<g fill="${p.text}" color="${p.text}">${embedLogo(card.logo, margin, layout.inlineHeader ? 16 : margin, layout.logo)}</g>
${lines
  .map(
    (line, index) =>
      `<text x="${textX}" y="${layout.nameBottom - (lines.length - 1 - index) * layout.lineGap}" font-family="${FONT}" font-size="${layout.nameSize}" font-weight="700" fill="${p.text}">${escapeXml(line)}</text>`,
  )
  .join("\n")}
<text x="${textX}" y="${configY}" font-family="${FONT}" font-size="${layout.configSize}" fill="${p.muted}">${escapeXml(truncate(card.configuration, layout.configChars))}</text>
<line x1="${margin}" y1="${top - 10}" x2="${360 - margin}" y2="${top - 10}" stroke="${p.border}" stroke-width="1.5"/>`;
  const rows = Math.ceil(card.values.length / columns);
  const w = (360 - margin * 2 - gap * (columns - 1)) / columns;
  const h = (layout.height - top - margin + 6 - gap * (rows - 1)) / rows;
  const tiles = card.values.map((value, index) => {
    const x = margin + (index % columns) * (w + gap);
    const y = top + Math.floor(index / columns) * (h + gap);
    const colors = verdictColors(value.verdict, theme);
    const tile = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${colors.fill}"/>`;
    if (columns === 1) {
      // Label on the left and the value right-aligned on one line.
      const size = fitFont(value.value, w - 40 - value.label.length * layout.labelSize * 0.52, layout.valueSize);
      return `${tile}
<text x="${x + 16}" y="${y + h / 2 + 7}" font-family="${FONT}" font-size="${layout.labelSize}" fill="${p.muted}">${escapeXml(value.label)}</text>
<text x="${x + w - 16}" y="${y + h / 2 + size * 0.36}" text-anchor="end" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${colors.text}">${escapeXml(value.value)}</text>`;
    }
    const size = fitFont(value.value, w - 28, layout.valueSize);
    return `${tile}
<text x="${x + 14}" y="${y + layout.labelSize + layout.padding}" font-family="${FONT}" font-size="${layout.labelSize}" fill="${p.muted}">${escapeXml(value.label)}</text>
<text x="${x + 14}" y="${y + h - layout.padding - 2}" font-family="${FONT}" font-size="${size}" font-weight="700" letter-spacing="-0.5" fill="${colors.text}">${escapeXml(value.value)}</text>`;
  });
  return frame(theme, `${header}\n${tiles.join("\n")}`, layout.height);
}
