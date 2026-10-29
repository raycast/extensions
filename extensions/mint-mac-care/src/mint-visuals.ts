// Pure SVG drawings for Raycast's markdown. Nothing is imported, so the tests
// and a browser can render exactly what Raycast shows; sizes are written by
// the formatter the caller passes (mint-cli's formatBytes).

export type ByteFormatter = (bytes: number) => string;

export type Appearance = "light" | "dark";

/** The Disk page's four groups, in the app's own fixed colours. */
export const GROUPS = [
  { key: "optimizable", title: "Optimizable", color: "#3DDC84" },
  { key: "safeToClean", title: "Safe to clean", color: "#62A3FF" },
  { key: "yours", title: "Yours", color: "#F5BD45" },
  { key: "keep", title: "Keep", color: "#8E8E93" },
] as const;

export type GroupKey = (typeof GROUPS)[number]["key"];
export type GroupBytes = Record<GroupKey, number>;

type Palette = { primary: string; secondary: string; tertiary: string; track: string; rule: string; accent: string };

export function palette(appearance: Appearance): Palette {
  return appearance === "light"
    ? {
        primary: "#1D1D1F",
        secondary: "#6E6E73",
        tertiary: "#8E8E93",
        track: "#E8E8ED",
        rule: "#D2D2D7",
        accent: "#336E00",
      }
    : {
        primary: "#F5F5F7",
        secondary: "#A1A1A6",
        tertiary: "#6E6E73",
        track: "#2C2C2E",
        rule: "#3A3A3C",
        accent: "#BDFE3A",
      };
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

export function escapeXML(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A markdown image Raycast draws at the given size. The alt text can be a folder or app name, so it is escaped. */
export function markdownImage(svg: string, width: number, height: number, alt = ""): string {
  const data = Buffer.from(svg, "utf8").toString("base64");
  const label = alt.replace(/[\\[\]]/g, "\\$&").replace(/[\r\n]+/g, " ");
  return `![${label}](data:image/svg+xml;base64,${data}?raycast-width=${width}&raycast-height=${height})`;
}

type RingPart = { bytes: number; color: string };

/**
 * Ring segments the way Mint's menu bar draws its Disk ring: each part's share
 * of the volume, Keep first from the top, the part that can go now last,
 * beside the free space. A part too small to see still gets a sliver.
 */
export function ringSegments(parts: RingPart[], total: number, circumference: number) {
  const minimum = 3 / circumference;
  const gap = 2 / circumference;
  const segments: Array<{ color: string; from: number; to: number }> = [];
  if (!(total > 0)) return segments;
  let start = 0;
  for (const part of parts) {
    if (!(part.bytes > 0) || start >= 1) continue;
    const end = Math.min(1, start + Math.max(minimum, part.bytes / total));
    segments.push({ color: part.color, from: start, to: Math.max(start, end - gap) });
    start = end;
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Cards in the menu bar dropdown's own layout: a header, a ring beside its
// legend, a rule, an Auto Care line. One screen of Raycast holds the status.
// ---------------------------------------------------------------------------

type CardPalette = Palette & { card: string; cardStroke: string };

function cardPalette(appearance: Appearance): CardPalette {
  const base = palette(appearance);
  return appearance === "light"
    ? { ...base, card: "rgba(0,0,0,0.028)", cardStroke: "rgba(0,0,0,0.09)", rule: "rgba(0,0,0,0.09)" }
    : {
        ...base,
        card: "rgba(255,255,255,0.045)",
        cardStroke: "rgba(255,255,255,0.09)",
        rule: "rgba(255,255,255,0.09)",
      };
}

type IconName = "disk" | "memory" | "folder" | "leaf" | "copies" | "broom";

/** Small line glyphs, 18 × 18, in the spirit of the dropdown's SF Symbols. */
function icon(name: IconName, x: number, y: number, color: string): string {
  const paths: Record<IconName, string> = {
    disk: `<rect x="2" y="5" width="14" height="9" rx="2.2"/><path d="M2.4 10.2h13.2"/><circle cx="12.6" cy="12.1" r="0.5" fill="${color}"/>`,
    memory: `<rect x="3" y="4.5" width="12" height="9" rx="1.6"/><rect x="6" y="7.5" width="6" height="3" rx="0.6"/><path d="M6 2.5v2M9 2.5v2M12 2.5v2M6 13.5v2M9 13.5v2M12 13.5v2"/>`,
    folder: `<path d="M2.5 5.2a1.2 1.2 0 0 1 1.2-1.2h3.1l1.6 1.8h5.9a1.2 1.2 0 0 1 1.2 1.2v6.6a1.2 1.2 0 0 1-1.2 1.2H3.7a1.2 1.2 0 0 1-1.2-1.2z"/>`,
    leaf: `<path d="M3.2 14.6C3.2 8 7.4 3.4 15 3.4c0 7.2-4.4 11.2-10.2 11.2"/><path d="M3 15.4l6.4-6.2"/>`,
    copies: `<rect x="5.5" y="5.5" width="9" height="10" rx="1.6"/><path d="M3.5 12.5V4.2a1.2 1.2 0 0 1 1.2-1.2h6.8"/>`,
    broom: `<path d="M11.5 2.5l-3 6"/><path d="M5 9.5h7l1.5 6h-10z"/><path d="M7 12.5l-.5 3M10 12.5l.3 3"/>`,
  };
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</g>`;
}

// Advance widths of SF Pro Text (regular, tabular digits) in em, for ASCII 32…126,
// measured with AppKit at 13 pt. Raycast draws these SVGs with -apple-system,
// so a label is cut by the room it really takes, never by its character count:
// "Codex runtime cache (~/.cache/cod…" is 34 characters and 233 pt at 13.5,
// wider than the column it was given (2026-09-30 screenshot).
const ASCII_EM = [
  0.275, 0.305, 0.472, 0.624, 0.624, 0.919, 0.706, 0.291, 0.376, 0.376, 0.466, 0.624, 0.291, 0.466, 0.291, 0.299, 0.624,
  0.624, 0.624, 0.624, 0.624, 0.624, 0.624, 0.624, 0.624, 0.624, 0.291, 0.291, 0.624, 0.624, 0.624, 0.507, 0.912, 0.668,
  0.651, 0.71, 0.721, 0.59, 0.566, 0.741, 0.736, 0.262, 0.532, 0.653, 0.562, 0.868, 0.736, 0.766, 0.629, 0.766, 0.647,
  0.631, 0.628, 0.731, 0.668, 0.962, 0.673, 0.649, 0.656, 0.376, 0.299, 0.376, 0.624, 0.578, 0.494, 0.546, 0.608, 0.554,
  0.608, 0.565, 0.356, 0.604, 0.583, 0.241, 0.241, 0.537, 0.247, 0.864, 0.578, 0.585, 0.604, 0.604, 0.375, 0.518, 0.357,
  0.578, 0.536, 0.769, 0.519, 0.537, 0.533, 0.376, 0.253, 0.376, 0.624,
];
const OTHER_EM: Record<string, number> = {
  "—": 0.868,
  "–": 0.624,
  "…": 0.799,
  "·": 0.291,
  "’": 0.291,
  "→": 0.9,
  "−": 0.624,
};

/** How wide `value` is drawn at `size` pt; a little generous, so a cut label never touches its neighbour. */
export function textWidth(value: string, size: number, weight = 400): number {
  let em = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 32 && code <= 126) em += ASCII_EM[code - 32];
    else if (OTHER_EM[char] !== undefined) em += OTHER_EM[char];
    else if (code >= 0x2e80) em += 1;
    else em += 0.65;
  }
  const heavier = weight >= 600 ? 1.07 : weight > 400 ? 1.035 : 1;
  return em * size * heavier * 1.03;
}

/** `value` cut to fit `room` pt at `size`, ending in "…" when it was cut. */
export function fitText(value: string, room: number, size: number, weight = 400): string {
  if (textWidth(value, size, weight) <= room) return value;
  const chars = [...value];
  let low = 0;
  let high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (textWidth(`${chars.slice(0, mid).join("").trimEnd()}…`, size, weight) <= room) low = mid;
    else high = mid - 1;
  }
  const kept = chars
    .slice(0, Math.max(1, low))
    .join("")
    .replace(/[\s—–·,(/-]+$/u, "");
  return `${kept || chars[0]}…`;
}

function text(
  x: number,
  y: number,
  value: string,
  fill: string,
  size: number,
  options: { weight?: number; anchor?: "start" | "middle" | "end" } = {},
) {
  const weight = options.weight ? ` font-weight="${options.weight}"` : "";
  const anchor = options.anchor && options.anchor !== "start" ? ` text-anchor="${options.anchor}"` : "";
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}"${weight}${anchor} style="font-variant-numeric: tabular-nums">${escapeXML(value)}</text>`;
}

function ring(cx: number, cy: number, r: number, width: number, parts: RingPart[], total: number, track: string) {
  const circumference = 2 * Math.PI * r;
  const arcs = ringSegments(parts, total, circumference)
    .map((segment) => {
      const length = Math.max(0, (segment.to - segment.from) * circumference);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${segment.color}" stroke-width="${width}" stroke-dasharray="${length.toFixed(2)} ${circumference.toFixed(2)}" stroke-dashoffset="${(-segment.from * circumference).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    })
    .join("");
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${width}"/>${arcs}`;
}

/** A legend row; `free` is the ring's empty track, drawn as a hollow dot and no arc. */
export type LegendRow = { title: string; color: string; bytes?: number; free?: boolean };

export type ResourceCard = {
  icon: "disk" | "memory";
  title: string;
  /** "391.1 GB / 494.4 GB" */
  usage: string;
  /** The ring's centre: a value, then what it is ("ready", "idle", "free"). */
  center: { value: string; label: string };
  legend: LegendRow[];
  totalBytes: number;
  care: string;
};

export type FolderCard = { name: string; status: string; care: string };

export type GlanceInput = {
  appearance: Appearance;
  format: ByteFormatter;
  disk?: ResourceCard;
  memory?: ResourceCard;
  folders?: FolderCard[];
  moreFolders?: number;
};

export const GLANCE_WIDTH = 680;
const CARD_GAP = 20;
const CARD_WIDTH = (GLANCE_WIDTH - CARD_GAP) / 2;
const RESOURCE_HEIGHT = 200;
const FOLDER_HEIGHT = 80;

function resourceCard(card: ResourceCard | undefined, x: number, p: CardPalette, format: ByteFormatter): string {
  const w = CARD_WIDTH;
  const frame = `<rect x="${x + 0.5}" y="0.5" width="${w - 1}" height="${RESOURCE_HEIGHT - 1}" rx="16" fill="${p.card}" stroke="${p.cardStroke}"/>`;
  if (!card) return `${frame}${text(x + w / 2, RESOURCE_HEIGHT / 2 + 4, "…", p.tertiary, 16, { anchor: "middle" })}`;
  const parts = card.legend
    .filter((row) => !row.free)
    .reverse()
    .map((row) => ({ bytes: row.bytes ?? 0, color: row.color }));
  const legend = card.legend
    .map((row, index) => {
      const y = 78 + index * 22;
      const dot = row.free
        ? `<circle cx="${x + 136}" cy="${y - 4.5}" r="3.6" fill="none" stroke="${p.tertiary}" stroke-width="1.3"/>`
        : `<circle cx="${x + 136}" cy="${y - 4.5}" r="4" fill="${row.color}"/>`;
      return `${dot}${text(x + 148, y, row.title, p.primary, 13)}${text(x + w - 18, y, row.bytes === undefined ? "—" : format(row.bytes), p.secondary, 13, { anchor: "end" })}`;
    })
    .join("");
  return [
    frame,
    icon(card.icon, x + 16, 17, p.secondary),
    text(x + 44, 32, card.title, p.primary, 16, { weight: 650 }),
    text(x + w - 18, 32, card.usage, p.secondary, 12.5, { anchor: "end" }),
    ring(x + 68, 106, 40, 9, parts, card.totalBytes, p.track),
    text(x + 68, 108, card.center.value, p.primary, 15, { weight: 650, anchor: "middle" }),
    text(x + 68, 123, card.center.label, p.secondary, 10.5, { anchor: "middle" }),
    legend,
    `<line x1="${x + 16}" y1="162" x2="${x + w - 16}" y2="162" stroke="${p.rule}"/>`,
    icon("leaf", x + 16, 170, p.secondary),
    text(x + 42, 184, "Auto Care", p.primary, 13, { weight: 650 }),
    text(x + w - 18, 184, fitText(card.care, w - 18 - 132, 12.5), p.secondary, 12.5, { anchor: "end" }),
  ].join("");
}

function folderCard(folder: FolderCard, x: number, y: number, p: CardPalette): string {
  const w = CARD_WIDTH;
  return [
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${FOLDER_HEIGHT - 1}" rx="16" fill="${p.card}" stroke="${p.cardStroke}"/>`,
    icon("folder", x + 16, y + 13, p.secondary),
    text(x + 44, y + 28, fitText(folder.name, w - 62 - textWidth(folder.status, 13) - 12, 14, 550), p.primary, 14, {
      weight: 550,
    }),
    text(x + w - 18, y + 28, folder.status, p.primary, 13, { anchor: "end" }),
    `<line x1="${x + 16}" y1="${y + 42}" x2="${x + w - 16}" y2="${y + 42}" stroke="${p.rule}"/>`,
    icon("leaf", x + 16, y + 50, p.secondary),
    text(x + 42, y + 64, "Auto Care", p.primary, 13, { weight: 650 }),
    text(x + w - 18, y + 64, fitText(folder.care, w - 18 - 132, 12.5), p.secondary, 12.5, { anchor: "end" }),
  ].join("");
}

/** Mint at a glance, in the dropdown's layout. Returns the SVG and its height. */
export function glanceSVG(input: GlanceInput): { svg: string; height: number } {
  const p = cardPalette(input.appearance);
  const parts = [
    resourceCard(input.disk, 0, p, input.format),
    resourceCard(input.memory, CARD_WIDTH + CARD_GAP, p, input.format),
  ];
  let height = RESOURCE_HEIGHT;
  const folders = input.folders ?? [];
  if (folders.length) {
    const headY = RESOURCE_HEIGHT + 34;
    parts.push(icon("folder", 0, headY - 15, p.primary), text(28, headY, "Organize", p.primary, 16, { weight: 650 }));
    if (input.moreFolders)
      parts.push(
        text(GLANCE_WIDTH - 2, headY, `${input.moreFolders} more in Mint`, p.secondary, 12.5, { anchor: "end" }),
      );
    const cardY = headY + 16;
    folders
      .slice(0, 2)
      .forEach((folder, index) => parts.push(folderCard(folder, index * (CARD_WIDTH + CARD_GAP), cardY, p)));
    height = cardY + FOLDER_HEIGHT;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${GLANCE_WIDTH}" height="${height}" viewBox="0 0 ${GLANCE_WIDTH} ${height}" font-family="${FONT}">${parts.join("")}</svg>`;
  return { svg, height };
}

// ---------------------------------------------------------------------------
// Detail-pane pictures: a number, then where it sits in the whole. They take
// the place of sentences (Yukun: a picture says it once).
// ---------------------------------------------------------------------------

export const PANE_WIDTH = 420;

export type BarSegment = { bytes: number; color: string; opacity?: number; label?: string };

/** N identical files drawn into one shared block: what Optimize does, without a sentence. */
export function copiesSVG(input: { appearance: Appearance; files: number; color: string }): {
  svg: string;
  height: number;
} {
  const p = cardPalette(input.appearance);
  const w = PANE_WIDTH;
  const shown = Math.min(input.files, 9);
  const step = 40;
  const startX = (w - (shown - 1) * step) / 2;
  const glyph = (cx: number, filled: boolean) =>
    `<path d="M${cx - 11} 6h15l7 7v21a2 2 0 0 1-2 2h-20a2 2 0 0 1-2-2v-26a2 2 0 0 1 2-2z" fill="${filled ? input.color : "none"}" fill-opacity="${filled ? 0.9 : 0}" stroke="${filled ? input.color : p.secondary}" stroke-width="1.4"/>`;
  const docs = Array.from({ length: shown }, (_, index) => startX + index * step);
  const lines = docs
    .map(
      (cx) =>
        `<path d="M${cx} 40 C${cx} 60 ${w / 2} 58 ${w / 2} 78" fill="none" stroke="${p.rule}" stroke-width="1.4"/>`,
    )
    .join("");
  const more =
    input.files > shown ? text(w - 4, 26, `+${input.files - shown}`, p.secondary, 12.5, { anchor: "end" }) : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="112" viewBox="0 0 ${w} 112" font-family="${FONT}">
${lines}
${docs.map((cx, index) => glyph(cx, index === 0)).join("")}
${more}
<rect x="${w / 2 - 60}" y="78" width="120" height="26" rx="8" fill="${input.color}" fill-opacity="0.18" stroke="${input.color}" stroke-width="1.2"/>
${text(w / 2, 96, "1 on disk", p.primary, 12.5, { weight: 600, anchor: "middle" })}
</svg>`;
  return { svg, height: 112 };
}

/** A whole split into its parts, each with its colour, name and size underneath. */
export function partsSVG(input: {
  appearance: Appearance;
  format: ByteFormatter;
  title: string;
  parts: BarSegment[];
}): { svg: string; height: number } {
  const p = cardPalette(input.appearance);
  const w = PANE_WIDTH;
  const parts = input.parts.filter((part) => part.bytes > 0);
  const total = parts.reduce((sum, part) => sum + part.bytes, 0);
  let x = 0;
  const bars = parts
    .map((part) => {
      const width = total > 0 ? Math.max(3, (part.bytes / total) * w) : 0;
      const rect = `<rect x="${x.toFixed(1)}" y="34" width="${Math.max(0, Math.min(width, w - x) - 2).toFixed(1)}" height="22" rx="4" fill="${part.color}" fill-opacity="${part.opacity ?? 1}"/>`;
      x += width;
      return rect;
    })
    .join("");
  const legend = parts
    .map((part, index) => {
      const y = 86 + index * 24;
      return `<circle cx="5" cy="${y - 4.5}" r="4.5" fill="${part.color}" fill-opacity="${part.opacity ?? 1}"/>${text(18, y, part.label ?? "", p.primary, 13.5)}${text(w, y, input.format(part.bytes), p.secondary, 13.5, { anchor: "end" })}`;
    })
    .join("");
  const height = 86 + Math.max(0, parts.length - 1) * 24 + 10;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" font-family="${FONT}">
${text(0, 18, input.title, p.secondary, 13)}
<rect x="0" y="34" width="${w}" height="22" rx="5" fill="${p.track}"/>
${bars}
${legend}
</svg>`;
  return { svg, height };
}

/** Mint's accent, bright on dark and deep on light (the website's pair). */
export function accent(appearance: Appearance): string {
  return palette(appearance).accent;
}

/**
 * Progress as the dropdown draws Auto Care's runs: a row of standing pills,
 * lit left to right. A big percentage and the count of files read above it.
 */
export function squaresSVG(input: {
  appearance: Appearance;
  fraction: number;
  title: string;
  detail?: string;
  estimated?: boolean;
}): { svg: string; height: number } {
  const p = cardPalette(input.appearance);
  const w = PANE_WIDTH;
  const count = 40;
  const gap = 3;
  const pill = (w - gap * (count - 1)) / count;
  const lit = Math.round(Math.min(1, Math.max(0, input.fraction)) * count);
  // The next square blinks while Mint works, in the accent or not at all, so
  // a step that holds the percentage still reads as alive.
  const blink = `<animate attributeName="fill" values="${p.track};${p.accent}" dur="1.2s" calcMode="discrete" repeatCount="indefinite"/>`;
  const pills = Array.from({ length: count }, (_, index) => {
    const x = index * (pill + gap);
    const working = index === lit && lit < count;
    return `<rect x="${x.toFixed(1)}" y="78" width="${pill.toFixed(1)}" height="24" rx="3" fill="${index < lit ? p.accent : p.track}">${working ? blink : ""}</rect>`;
  }).join("");
  const percent = `${input.estimated ? "about " : ""}${Math.round(input.fraction * 100)}%`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="112" viewBox="0 0 ${w} 112" font-family="${FONT}">
${text(0, 18, input.title, p.secondary, 13.5)}
${text(0, 58, percent, p.primary, 30, { weight: 700 })}
${input.detail ? text(w, 58, input.detail, p.secondary, 13.5, { anchor: "end" }) : ""}
${pills}
</svg>`;
  return { svg, height: 112 };
}

export type ListRow = {
  title: string;
  detail?: string;
  value: string;
  color?: string;
  /** Done: drawn faint with a line through it, as the app strikes a row before it folds away. */
  struck?: boolean;
};
/** A part of the whole a group belongs to; the group's own part is lit. */
export type WholePart = { bytes: number; lit: boolean };

/**
 * A group's contents: its total, where it sits in the whole (its part lit,
 * the others faint), then its rows, largest first.
 */
export function listSVG(input: {
  appearance: Appearance;
  value: string;
  label: string;
  color: string;
  rows: ListRow[];
  more?: string;
  whole?: WholePart[];
}): { svg: string; height: number } {
  const p = cardPalette(input.appearance);
  const w = PANE_WIDTH;
  const bar = input.whole ? wholeBar(input.whole, input.color, p.track, 72) : "";
  const top = input.whole ? 112 : 92;
  const step = 25;
  const rows = input.rows
    .map((row, index) => {
      const y = top + index * step;
      const dot = row.color ? `<circle cx="4.5" cy="${y - 4.5}" r="4" fill="${row.color}"/>` : "";
      const x = row.color ? 16 : 0;
      // Columns by the room each label takes: the size at the right edge, the
      // detail ending 96 pt before it, the title in whatever is left of that.
      const valueStart = w - Math.max(textWidth(row.value, 13.5), 60) - 14;
      const detailText = row.detail ? fitText(row.detail, 130, 12.5) : "";
      const detailEnd = Math.min(w - 96, valueStart);
      const titleEnd = row.detail ? detailEnd - textWidth(detailText, 12.5) - 14 : valueStart;
      const detail = row.detail ? text(detailEnd, y, detailText, p.tertiary, 12.5, { anchor: "end" }) : "";
      const title = text(x, y, fitText(row.title, titleEnd - x, 13.5), row.struck ? p.tertiary : p.primary, 13.5);
      const value = text(w, y, row.value, row.struck ? p.tertiary : p.secondary, 13.5, { anchor: "end" });
      const strike = row.struck
        ? `<line x1="${x}" y1="${y - 4.5}" x2="${w}" y2="${y - 4.5}" stroke="${p.secondary}" stroke-width="1.2"/>`
        : "";
      return `<g opacity="${row.struck ? 0.75 : 1}">${dot}${title}${detail}${value}${strike}</g><line x1="0" y1="${y + 8}" x2="${w}" y2="${y + 8}" stroke="${p.rule}"/>`;
    })
    .join("");
  const end = top + Math.max(0, input.rows.length - 1) * step + 10;
  const more = input.more ? text(0, end + 22, input.more, p.tertiary, 12.5) : "";
  const height = end + (input.more ? 32 : 8);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" font-family="${FONT}">
${text(0, 34, input.value, p.primary, 30, { weight: 700 })}
<circle cx="5" cy="52" r="4.5" fill="${input.color}"/>${text(16, 57, input.label, p.secondary, 14)}
${bar}
${rows}
${more}
</svg>`;
  return { svg, height };
}

/** The whole as one bar: the lit part first in the group's colour, the rest faint, largest first. */
function wholeBar(parts: WholePart[], color: string, track: string, y: number): string {
  const w = PANE_WIDTH;
  const ordered = [
    ...parts.filter((part) => part.lit),
    ...parts.filter((part) => !part.lit).sort((a, b) => b.bytes - a.bytes),
  ];
  const total = ordered.reduce((sum, part) => sum + Math.max(0, part.bytes), 0);
  let x = 0;
  const rects: string[] = [];
  for (const part of ordered) {
    if (!(total > 0) || x >= w) break;
    const width = Math.max(part.lit && part.bytes > 0 ? 3 : 0, (Math.max(0, part.bytes) / total) * w);
    if (width < 0.6) continue;
    rects.push(
      `<rect x="${x.toFixed(1)}" y="${y}" width="${Math.max(0, Math.min(width, w - x) - 1.5).toFixed(1)}" height="12" rx="3" fill="${part.lit ? color : track}"/>`,
    );
    x += width;
  }
  return `<rect x="0" y="${y}" width="${w}" height="12" rx="4" fill="${track}" opacity="0.55"/>${rects.join("")}`;
}

export type TrendPoint = { at: number; bytes: number | null };

/**
 * One thing's size over time: its size now, how much it moved in the window,
 * then a line over every recorded point with the window shaded. A point
 * where it was not recorded is a gap, never zero.
 */
export function trendSVG(input: {
  appearance: Appearance;
  value: string;
  change: string;
  color: string;
  points: TrendPoint[];
  windowStart?: number;
  windowLabel?: string;
  format: ByteFormatter;
  startLabel: string;
  endLabel: string;
}): { svg: string; height: number } {
  const p = cardPalette(input.appearance);
  const w = PANE_WIDTH;
  const top = 84;
  const chartHeight = 150;
  const bottom = top + chartHeight;
  const known = input.points.filter((point) => point.bytes !== null) as Array<{ at: number; bytes: number }>;
  const first = input.points[0]?.at ?? 0;
  const last = input.points[input.points.length - 1]?.at ?? 1;
  const span = Math.max(1, last - first);
  const max = Math.max(1, ...known.map((point) => point.bytes));
  const min = Math.min(max, ...known.map((point) => point.bytes));
  // Start the axis a little under the smallest value so a change reads as a change.
  const floor = Math.max(0, min - (max - min) * 0.35);
  const x = (at: number) => ((at - first) / span) * (w - 8) + 4;
  const y = (bytes: number) => bottom - ((bytes - floor) / Math.max(1, max - floor)) * (chartHeight - 12);

  const runs: Array<Array<{ at: number; bytes: number }>> = [];
  let run: Array<{ at: number; bytes: number }> = [];
  for (const point of input.points) {
    if (point.bytes === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push({ at: point.at, bytes: point.bytes });
  }
  if (run.length) runs.push(run);

  const lines = runs
    .map((segment) => {
      const d = segment
        .map((point, index) => `${index ? "L" : "M"}${x(point.at).toFixed(1)} ${y(point.bytes).toFixed(1)}`)
        .join(" ");
      const area =
        segment.length > 1
          ? `<path d="${d} L${x(segment[segment.length - 1].at).toFixed(1)} ${bottom} L${x(segment[0].at).toFixed(1)} ${bottom} Z" fill="${p.primary}" fill-opacity="0.07"/>`
          : "";
      const dot =
        segment.length === 1
          ? `<circle cx="${x(segment[0].at).toFixed(1)}" cy="${y(segment[0].bytes).toFixed(1)}" r="2.5" fill="${input.color}"/>`
          : "";
      return `${area}<path d="${d}" fill="none" stroke="${input.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dot}`;
    })
    .join("");
  const end = known[known.length - 1];
  const endDot = end
    ? `<circle cx="${x(end.at).toFixed(1)}" cy="${y(end.bytes).toFixed(1)}" r="4" fill="${input.color}"/>`
    : "";
  const shade =
    input.windowStart !== undefined && input.windowStart > first
      ? `<rect x="${x(input.windowStart).toFixed(1)}" y="${top - 6}" width="${(w - x(input.windowStart)).toFixed(1)}" height="${chartHeight + 6}" rx="4" fill="${p.track}" opacity="0.6"/>${input.windowLabel ? text(x(input.windowStart) + 6, top + 8, input.windowLabel, p.tertiary, 11.5) : ""}`
      : "";
  const height = bottom + 26;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" font-family="${FONT}">
${text(0, 34, input.value, p.primary, 30, { weight: 700 })}
<circle cx="5" cy="52" r="4.5" fill="${input.color}"/>${text(16, 57, input.change, p.secondary, 14)}
${shade}
<line x1="0" y1="${bottom}" x2="${w}" y2="${bottom}" stroke="${p.rule}"/>
${text(w, top - 12, input.format(max), p.tertiary, 11.5, { anchor: "end" })}
${lines}
${endDot}
${text(0, bottom + 18, input.startLabel, p.tertiary, 11.5)}
${text(w, bottom + 18, input.endLabel, p.tertiary, 11.5, { anchor: "end" })}
</svg>`;
  return { svg, height };
}
