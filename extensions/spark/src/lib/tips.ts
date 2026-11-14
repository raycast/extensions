// Spark's search tips, drawn as one image for Search Mail's empty state.
// Raycast lists have no grid, and an empty view shows only an image, a title,
// and a line of text - so the grid of icons, syntax, and descriptions is one
// SVG. The syntax is what the CLI accepts, which is Gmail-style rather than
// Spark's own ("newer_than:7d" for "last week").
//
// No Raycast imports here: this file runs under `node --test` as-is.

import { textWidth } from "./avatar.ts";

type Glyph =
  "person" | "text" | "folder" | "clip" | "envelope" | "calendar" | "delegated" | "assigned" | "done" | "unassigned";

interface Tip {
  syntax: string;
  description: string;
  glyph: Glyph;
}

const BLUE = "#3B82F6";
const GRAY = "#8E8E93";
const YELLOW = "#F5B83D";
const GREEN = "#4CC764";
const RED = "#F0616D";
const PURPLE = "#8B5CF6";

const GLYPH_COLORS: Record<Glyph, string> = {
  person: BLUE,
  text: GRAY,
  folder: YELLOW,
  clip: GREEN,
  envelope: BLUE,
  calendar: RED,
  delegated: PURPLE,
  assigned: PURPLE,
  done: PURPLE,
  unassigned: PURPLE,
};

// 16×16 line icons in the spirit of Spark's.
const GLYPH_PATHS: Record<Glyph, string> = {
  person: `<circle cx="8" cy="5" r="3"/><path d="M2.5 15c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5"/>`,
  text: `<path d="M2.5 3.5h8M6.5 3.5v10M10 8.5h4.5M12.25 8.5v5"/>`,
  folder: `<path d="M1.5 4.5a1 1 0 0 1 1-1h3.5l1.5 1.5h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z"/>`,
  clip: `<rect x="1.5" y="4.5" width="13" height="7" rx="3.5"/><path d="M5 8h6"/>`,
  envelope: `<rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M2 4.5l6 4.5 6-4.5"/>`,
  calendar: `<rect x="2" y="2.5" width="12" height="11" rx="2"/><rect x="9" y="9" width="2.5" height="2.5" rx="0.5"/>`,
  delegated: `<circle cx="8" cy="8" r="6.5"/><path d="M5 8h6M8.5 5.5L11 8l-2.5 2.5"/>`,
  assigned: `<circle cx="8" cy="8" r="6.5"/><path d="M11 8H5M7.5 5.5L5 8l2.5 2.5"/>`,
  done: `<path d="M1.5 8.5l3 3 5.5-7"/><circle cx="12.5" cy="12" r="2"/>`,
  unassigned: `<circle cx="8" cy="5" r="3"/><path d="M2.5 15c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5M2 14.5L14 2.5"/>`,
};

/// Spark's grid: four columns of four, in Spark's order.
export function searchTips(now = new Date()): Tip[][] {
  const year = now.getFullYear();
  return [
    [
      { syntax: "from:alex", description: "Emails from Alex", glyph: "person" },
      { syntax: "to:max", description: "Emails sent to Max", glyph: "person" },
      { syntax: '"spark email"', description: "Contains “spark email”", glyph: "text" },
      { syntax: "assigned_by:me", description: "Emails you delegated", glyph: "delegated" },
    ],
    [
      { syntax: "subject:asap", description: "Subject contains “asap”", glyph: "text" },
      { syntax: "has:attachment", description: "With attachments", glyph: "clip" },
      { syntax: "has:document", description: "Contains documents", glyph: "clip" },
      { syntax: "assigned_to:me", description: "Emails assigned to you", glyph: "assigned" },
    ],
    [
      { syntax: "in:inbox", description: "In the Inbox", glyph: "folder" },
      { syntax: "in:sent", description: "In the Sent folder", glyph: "folder" },
      { syntax: "is:unread", description: "Unread emails", glyph: "envelope" },
      { syntax: "is:shared_inbox_done", description: "Finished assigned emails", glyph: "done" },
    ],
    [
      { syntax: "cc:john", description: "Copies sent to John", glyph: "person" },
      { syntax: `after:${year}/06/14`, description: `Emails since 14 June ${year}`, glyph: "calendar" },
      { syntax: "newer_than:7d", description: "Emails from the last week", glyph: "calendar" },
      { syntax: "assigned_to:unassigned", description: "Not in a shared inbox yet", glyph: "unassigned" },
    ],
  ];
}

const FONT = "-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif";
// Raycast draws an empty view's image at most about 240 pt tall and scales
// the width with it, so the panel is drawn under that height - at full size,
// as wide as the window allows. It stays vertically centered: extra height
// to push it up would count toward the 240 and shrink it again.
const SYNTAX_SIZE = 14;
const DESCRIPTION_SIZE = 12;
const ICON_SPACE = 22;
const COLUMN_GAP = 14;
const ROW_HEIGHT = 44;
const TOP = 28;
export const TIPS_MAX_HEIGHT = 240;
/// The panel is laid out at the sizes above and shown at 90% of them.
const SCALE = 0.9;

function escapeXML(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/// Spark's own search-tip icons, as SVG markup by glyph; any that's missing
/// falls back to the line icon drawn here.
export type TipIcons = Partial<Record<Glyph | "combine", string>>;

/// The Spark icon file each glyph uses.
export const TIP_ICON_FILES: Record<Glyph | "combine", string> = {
  person: "SearchTipsPerson",
  text: "SearchTipsText",
  folder: "SearchTipsFolder",
  clip: "SearchTipsAttach",
  envelope: "SearchTipsMail",
  calendar: "SearchTipsCalendar",
  delegated: "SearchAssigned",
  assigned: "SearchAssignedToMe",
  done: "SearchCompleted",
  unassigned: "SearchUnassigned",
  combine: "SearchTipsCombine",
};

const ICON_SIZE = 16;

/// Places an icon's own SVG at (x, y): its root element is kept - with its
/// viewBox and fills - and given a position, a size, and the glyph's color for
/// the parts drawn in currentColor.
function embed(markup: string, x: number, y: number, color: string): string | undefined {
  const root = markup.match(/<svg\b[^>]*>/)?.[0];
  if (!root) return undefined;
  const attributes = root.replace(/^<svg|>$/g, "").replace(/\s(width|height|x|y|color)="[^"]*"/g, "");
  const svg = markup.slice(markup.indexOf(root) + root.length, markup.lastIndexOf("</svg>"));
  return `<svg x="${x}" y="${y}" width="${ICON_SIZE}" height="${ICON_SIZE}" color="${color}"${attributes}>${svg}</svg>`;
}

function glyph(kind: Glyph | "combine", x: number, y: number, icons: TipIcons): string {
  const color = GLYPH_COLORS[kind === "combine" ? "person" : kind];
  const spark = icons[kind] && embed(icons[kind]!, x, y, color);
  if (spark) return spark;
  const paths = GLYPH_PATHS[kind === "combine" ? "person" : kind];
  return (
    `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.4" ` +
    `stroke-linecap="round" stroke-linejoin="round">${paths}</g>`
  );
}

/// The tips panel as an SVG data URI, colored for Raycast's appearance.
export function tipsSVG(dark: boolean, icons: TipIcons = {}, now = new Date()): string {
  const title = dark ? "#E5E5EA" : "#1D1D1F";
  const secondary = dark ? GRAY : "#6E6E73";
  const columns = searchTips(now);
  // Each column is as wide as its longest line.
  const widths = columns.map(
    (column) =>
      ICON_SPACE +
      Math.max(
        ...column.map((tip) =>
          Math.max(textWidth(tip.syntax, SYNTAX_SIZE), textWidth(tip.description, DESCRIPTION_SIZE)),
        ),
      ),
  );
  const width = widths.reduce((sum, w) => sum + w, 0) + COLUMN_GAP * (columns.length - 1);
  const rows = Math.max(...columns.map((column) => column.length));
  const footerY = TOP + rows * ROW_HEIGHT + 16;
  const height = footerY + 8;

  const parts = [
    `<text x="0" y="14" font-family="${FONT}" font-size="13" font-weight="600" fill="${secondary}">Tips</text>`,
  ];
  let x = 0;
  columns.forEach((column, c) => {
    column.forEach((tip, r) => {
      const y = TOP + r * ROW_HEIGHT;
      parts.push(
        glyph(tip.glyph, x, y + 1, icons),
        `<text x="${x + ICON_SPACE}" y="${y + 14}" font-family="${FONT}" font-size="${SYNTAX_SIZE}" fill="${title}">${escapeXML(tip.syntax)}</text>`,
        `<text x="${x + ICON_SPACE}" y="${y + 30}" font-family="${FONT}" font-size="${DESCRIPTION_SIZE}" fill="${secondary}">${escapeXML(tip.description)}</text>`,
      );
    });
    x += widths[c] + COLUMN_GAP;
  });
  parts.push(
    glyph("combine", 0, footerY - 12, icons),
    `<text x="${ICON_SPACE}" y="${footerY}" font-family="${FONT}" font-size="13" fill="${secondary}">` +
      `Combine keywords for better results. For example, ` +
      `<tspan fill="${title}">from:alex has:attachment</tspan></text>`,
  );

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * SCALE)}" height="${Math.round(height * SCALE)}" viewBox="0 0 ${width} ${height}">` +
    `${parts.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
