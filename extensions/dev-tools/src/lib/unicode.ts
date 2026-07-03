// Pure runtime logic for the Unicode Browser command. Block/range/plane metadata
// is imported eagerly from a small committed JSON file; the ~40k named characters
// live in a larger file under assets/ that is read (once) lazily on first use.
import { environment } from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import blocksData from "./data/unicode-blocks.json";

export type Block = { name: string; start: number; end: number };
export type AlgoRange = { start: number; end: number; label: string; gc: string; age: string | null };
export type Plane = { index: number; name: string; start: number; end: number };
export type GcGroup = "Letter" | "Mark" | "Number" | "Punctuation" | "Symbol" | "Separator" | "Other";

export type CharInfo = {
  cp: number;
  char: string;
  hex: string; // "U+0041"
  decimal: number;
  name: string;
  block: string;
  plane: string;
  gc: string;
  gcGroup: GcGroup;
  htmlEntity: string; // "&#x41;"
  htmlDecEntity: string; // "&#65;"
  utf8: string; // "F0 9F 98 80"
  utf16: string; // "D83D DE00"
  jsEscape: string; // "\\u0041" / "\\u{1F600}"
  age: string | null;
  isControl: boolean;
  isPrintable: boolean;
  isAssigned: boolean;
};

const RAW = blocksData as { unicodeVersion: string; blocks: Block[]; ranges: AlgoRange[] };

export const UNICODE_VERSION = RAW.unicodeVersion;
export const BLOCKS: Block[] = RAW.blocks;
export const RANGES: AlgoRange[] = RAW.ranges;

const PLANE_NAMES: Record<number, string> = {
  0: "Basic Multilingual Plane",
  1: "Supplementary Multilingual Plane",
  2: "Supplementary Ideographic Plane",
  3: "Tertiary Ideographic Plane",
  14: "Supplementary Special-purpose Plane",
  15: "Supplementary Private Use Area-A",
  16: "Supplementary Private Use Area-B",
};

export const PLANES: Plane[] = Array.from({ length: 17 }, (_, i) => ({
  index: i,
  name: PLANE_NAMES[i] ?? "Unassigned",
  start: i * 0x10000,
  end: i * 0x10000 + 0xffff,
}));

const GC_GROUP: Record<string, GcGroup> = {
  Lu: "Letter",
  Ll: "Letter",
  Lt: "Letter",
  Lm: "Letter",
  Lo: "Letter",
  Mn: "Mark",
  Mc: "Mark",
  Me: "Mark",
  Nd: "Number",
  Nl: "Number",
  No: "Number",
  Pc: "Punctuation",
  Pd: "Punctuation",
  Ps: "Punctuation",
  Pe: "Punctuation",
  Pi: "Punctuation",
  Pf: "Punctuation",
  Po: "Punctuation",
  Sm: "Symbol",
  Sc: "Symbol",
  Sk: "Symbol",
  So: "Symbol",
  Zs: "Separator",
  Zl: "Separator",
  Zp: "Separator",
  Cc: "Other",
  Cf: "Other",
  Cs: "Other",
  Co: "Other",
  Cn: "Other",
};

export function gcGroup(gc: string): GcGroup {
  return GC_GROUP[gc] ?? "Other";
}

export const GC_NAME: Record<string, string> = {
  Lu: "Uppercase Letter",
  Ll: "Lowercase Letter",
  Lt: "Titlecase Letter",
  Lm: "Modifier Letter",
  Lo: "Other Letter",
  Mn: "Nonspacing Mark",
  Mc: "Spacing Mark",
  Me: "Enclosing Mark",
  Nd: "Decimal Number",
  Nl: "Letter Number",
  No: "Other Number",
  Pc: "Connector Punctuation",
  Pd: "Dash Punctuation",
  Ps: "Open Punctuation",
  Pe: "Close Punctuation",
  Pi: "Initial Punctuation",
  Pf: "Final Punctuation",
  Po: "Other Punctuation",
  Sm: "Math Symbol",
  Sc: "Currency Symbol",
  Sk: "Modifier Symbol",
  So: "Other Symbol",
  Zs: "Space Separator",
  Zl: "Line Separator",
  Zp: "Paragraph Separator",
  Cc: "Control",
  Cf: "Format",
  Cs: "Surrogate",
  Co: "Private Use",
  Cn: "Unassigned",
};

type NameRow = [number, string, string, string | null]; // [cp, name, gc, age]
let namesCache: { byCp: Map<number, NameRow>; rows: NameRow[] } | null = null;

function loadNames(): { byCp: Map<number, NameRow>; rows: NameRow[] } {
  if (namesCache) return namesCache;
  const raw = readFileSync(join(environment.assetsPath, "unicode-names.json"), "utf8");
  const parsed = JSON.parse(raw) as { v: string; chars: NameRow[] };
  const byCp = new Map<number, NameRow>();
  for (const row of parsed.chars) byCp.set(row[0], row);
  namesCache = { byCp, rows: parsed.chars };
  return namesCache;
}

const hex4 = (cp: number) => cp.toString(16).toUpperCase().padStart(4, "0");

export function isC0C1(cp: number): boolean {
  return cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f);
}

function rangeOf(cp: number): AlgoRange | null {
  for (const r of RANGES) if (cp >= r.start && cp <= r.end) return r;
  return null;
}

// Hangul syllable names are algorithmic (Unicode §3.12).
const HANGUL_L = ["G", "GG", "N", "D", "DD", "R", "M", "B", "BB", "S", "SS", "", "J", "JJ", "C", "K", "T", "P", "H"];
const HANGUL_V = ["A", "AE", "YA", "YAE", "EO", "E", "YEO", "YE", "O", "WA", "WAE", "OE", "YO", "U", "WEO", "WE", "WI", "YU", "EU", "YI", "I"]; // prettier-ignore
const HANGUL_T = ["", "G", "GG", "GS", "N", "NJ", "NH", "D", "L", "LG", "LM", "LB", "LS", "LT", "LP", "LH", "M", "B", "BS", "S", "SS", "NG", "J", "C", "K", "T", "P", "H"]; // prettier-ignore

function hangulName(cp: number): string {
  const s = cp - 0xac00;
  const t = s % 28;
  const v = Math.floor((s % 588) / 28);
  const l = Math.floor(s / 588);
  return `HANGUL SYLLABLE ${HANGUL_L[l]}${HANGUL_V[v]}${HANGUL_T[t]}`;
}

function synthesizeName(label: string, cp: number): string {
  if (label === "Hangul Syllable") return hangulName(cp);
  const hex = hex4(cp);
  if (label.startsWith("CJK Ideograph")) return `CJK UNIFIED IDEOGRAPH-${hex}`;
  if (label.startsWith("Tangut Ideograph")) return `TANGUT IDEOGRAPH-${hex}`;
  if (label.includes("Surrogate")) return `<surrogate-${hex}>`;
  if (label.includes("Private Use")) return `<private-use-${hex}>`;
  return `${label.toUpperCase()}-${hex}`;
}

export function nameOf(cp: number): string {
  const range = rangeOf(cp);
  if (range) return synthesizeName(range.label, cp);
  const row = loadNames().byCp.get(cp);
  if (row) return row[1];
  if (isC0C1(cp)) return `<control-${hex4(cp)}>`;
  return "";
}

export function gcOf(cp: number): string {
  const range = rangeOf(cp);
  if (range) return range.gc;
  const row = loadNames().byCp.get(cp);
  if (row) return row[2];
  if (isC0C1(cp)) return "Cc";
  return "Cn";
}

function ageOf(cp: number): string | null {
  const range = rangeOf(cp);
  if (range) return range.age;
  return loadNames().byCp.get(cp)?.[3] ?? null;
}

export function planeOf(cp: number): Plane {
  return PLANES[cp >> 16] ?? PLANES[0];
}

export function blockOf(cp: number): Block | null {
  let lo = 0;
  let hi = BLOCKS.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = BLOCKS[mid];
    if (cp < b.start) hi = mid - 1;
    else if (cp > b.end) lo = mid + 1;
    else return b;
  }
  return null;
}

export function blockByName(name: string): Block | null {
  return BLOCKS.find((b) => b.name === name) ?? null;
}

export function blockSize(block: Block): number {
  return block.end - block.start + 1;
}

/** Code points [block.start + offset, …] capped at `count` and the block end. Pure arithmetic. */
export function charsInBlock(block: Block, offset: number, count: number): number[] {
  const out: number[] = [];
  for (let cp = block.start + offset; cp <= block.end && out.length < count; cp++) out.push(cp);
  return out;
}

export function searchBlocks(query: string): Block[] {
  const q = query.toLowerCase();
  const cp = parseCodePoint(query);
  return BLOCKS.filter((b) => b.name.toLowerCase().includes(q) || (cp !== null && cp >= b.start && cp <= b.end));
}

/** Resolve a code-point query: explicit U+/0x/\u prefixes, or bare 4–6 hex digits. */
export function parseCodePoint(query: string): number | null {
  const q = query.trim();
  let m = q.match(/^(?:u\+|0x|\\u\{?)([0-9a-f]{1,6})\}?$/i);
  if (!m) m = q.match(/^([0-9a-f]{4,6})$/i);
  if (!m) return null;
  const cp = parseInt(m[1], 16);
  return cp >= 0 && cp <= 0x10ffff ? cp : null;
}

export type SearchResult = { blocks: Block[]; chars: number[] };

export function search(query: string, limit: number): SearchResult {
  const q = query.trim();
  if (!q) return { blocks: [], chars: [] };

  const blocks = searchBlocks(q);
  const chars: number[] = [];
  const seen = new Set<number>();
  const add = (cp: number) => {
    if (cp >= 0 && cp <= 0x10ffff && !seen.has(cp)) {
      seen.add(cp);
      chars.push(cp);
    }
  };

  const cp = parseCodePoint(q);
  if (cp !== null) add(cp);
  if ([...q].length === 1) add(q.codePointAt(0) as number);

  const needle = q.toLowerCase();
  const { rows } = loadNames();
  for (let i = 0; i < rows.length && chars.length < limit; i++) {
    if (rows[i][1].toLowerCase().includes(needle)) add(rows[i][0]);
  }

  return { blocks, chars };
}

function isAssigned(cp: number): boolean {
  return !!rangeOf(cp) || loadNames().byCp.has(cp) || isC0C1(cp);
}

function isPrintableCp(cp: number, gc: string): boolean {
  return isAssigned(cp) && gc !== "Cc" && gc !== "Cs" && gc !== "Cn";
}

/** Minimal, Buffer-free fields for an item's copy actions (cheap to call per grid cell). */
export type CopyFields = { char: string; hex: string; name: string; htmlEntity: string; jsEscape: string; isPrintable: boolean }; // prettier-ignore

export function copyFields(cp: number): CopyFields {
  const gc = gcOf(cp);
  const isPrintable = isPrintableCp(cp, gc);
  return {
    char: isPrintable ? String.fromCodePoint(cp) : "",
    hex: `U+${hex4(cp)}`,
    name: nameOf(cp) || "<unassigned>",
    htmlEntity: `&#x${cp.toString(16).toUpperCase()};`,
    jsEscape: cp > 0xffff ? `\\u{${cp.toString(16).toUpperCase()}}` : `\\u${hex4(cp)}`,
    isPrintable,
  };
}

const toHexBytes = (buf: Uint8Array) => Array.from(buf, (b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

export function charInfo(cp: number): CharInfo {
  const gc = gcOf(cp);
  const assigned = isAssigned(cp);
  const isControl = gc === "Cc";
  const isPrintable = isPrintableCp(cp, gc);
  const char = isPrintable ? String.fromCodePoint(cp) : "";

  const utf16Units: number[] = [];
  for (const unit of (char || "").split("")) utf16Units.push(unit.charCodeAt(0));

  return {
    cp,
    char,
    hex: `U+${hex4(cp)}`,
    decimal: cp,
    name: nameOf(cp) || "<unassigned>",
    block: blockOf(cp)?.name ?? "No Block",
    plane: planeOf(cp).name,
    gc,
    gcGroup: gcGroup(gc),
    htmlEntity: `&#x${cp.toString(16).toUpperCase()};`,
    htmlDecEntity: `&#${cp};`,
    utf8: char ? toHexBytes(Buffer.from(char, "utf8")) : "",
    utf16: char ? utf16Units.map((u) => u.toString(16).toUpperCase().padStart(4, "0")).join(" ") : "",
    jsEscape: cp > 0xffff ? `\\u{${cp.toString(16).toUpperCase()}}` : `\\u${hex4(cp)}`,
    age: ageOf(cp),
    isControl,
    isPrintable,
    isAssigned: assigned,
  };
}
