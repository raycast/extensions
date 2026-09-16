import { getPreferenceValues } from "@raycast/api";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { basename, dirname, join, relative, sep } from "path";

export type MediaKind = "Movie" | "Series";
export type Section = "Watchlist" | "Watched";

const SECTION_HEADINGS: Section[] = ["Watchlist", "Watched"];
const INITIAL_NOTE = [
  "# Movies",
  "",
  "## Watchlist",
  "",
  "## Watched",
  "",
].join("\n");

export interface MediaItem {
  watched: boolean;
  poster: string;
  title: string;
  imdbId: string;
  kind: MediaKind;
  year: string;
  director: string;
  genre: string;
  imdbRating: string;
  myRating: string;
  notes: string;
}

export const COLUMNS = [
  "✓",
  "Poster",
  "Title",
  "Type",
  "Year",
  "Director",
  "Genre",
  "IMDb",
  "Mine",
  "Notes",
];
const ALIGN = [
  ":-:",
  ":-:",
  "---",
  ":-:",
  ":-:",
  "---",
  "---",
  ":-:",
  ":-:",
  "---",
];
const UNCHECKED = "☐";
const CHECKED = "☑";
const POSTER_W = 55;

export function emptyItem(): MediaItem {
  return {
    watched: false,
    poster: "",
    title: "",
    imdbId: "",
    kind: "Movie",
    year: "",
    director: "",
    genre: "",
    imdbRating: "",
    myRating: "",
    notes: "",
  };
}

/* ---------- table primitives ---------- */

function headerLine(): string {
  return "| " + COLUMNS.join(" | ") + " |";
}
function dividerLine(): string {
  return "| " + ALIGN.join(" | ") + " |";
}
function isDivider(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && /^[\s|:-]+$/.test(t) && t.includes("-");
}
function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && !isDivider(line);
}

/** Split a markdown row, honouring \| escapes. */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cur += "\\|";
      i++;
    } else if (s[i] === "|") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += s[i];
    }
  }
  cells.push(cur.trim());
  return cells;
}

/** Escape a plain value for safe use inside a table cell. */
function esc(v: string): string {
  return (v || "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}
function unesc(v: string): string {
  return (v || "").replace(/\\\|/g, "|").trim();
}

/* ---------- cell encoders / decoders ---------- */

function posterCell(url: string): string {
  if (!url) return "";
  return `![\\|${POSTER_W}](${url})`;
}
function parsePoster(cell: string): string {
  const m = cell.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return m ? m[1].trim() : "";
}

function titleCell(title: string, imdbId: string): string {
  const t = esc(title);
  if (!imdbId) return t;
  return `[${t}](https://www.imdb.com/title/${imdbId}/)`;
}
function parseTitle(cell: string): { title: string; imdbId: string } {
  const m = cell.match(/^\[(.+?)\]\((https?:\/\/[^)]*?\/title\/(tt\d+)\/?)\)$/);
  if (m) return { title: unesc(m[1]), imdbId: m[3] };
  return { title: unesc(cell), imdbId: "" };
}

function rowToLine(it: MediaItem): string {
  const cells = [
    it.watched ? CHECKED : UNCHECKED,
    posterCell(it.poster),
    titleCell(it.title, it.imdbId),
    it.kind,
    esc(it.year),
    esc(it.director),
    esc(it.genre),
    esc(it.imdbRating),
    esc(it.myRating),
    esc(it.notes),
  ];
  return "| " + cells.join(" | ") + " |";
}

function lineToRow(line: string): MediaItem {
  const c = splitRow(line);
  const { title, imdbId } = parseTitle(c[2] ?? "");
  const kindRaw = (c[3] ?? "").toLowerCase();
  return {
    watched: (c[0] ?? "").includes(CHECKED),
    poster: parsePoster(c[1] ?? ""),
    title,
    imdbId,
    kind: kindRaw.startsWith("s") ? "Series" : "Movie",
    year: unesc(c[4] ?? ""),
    director: unesc(c[5] ?? ""),
    genre: unesc(c[6] ?? ""),
    imdbRating: unesc(c[7] ?? ""),
    myRating: unesc(c[8] ?? ""),
    notes: unesc(c[9] ?? ""),
  };
}

/* ---------- section / layout ---------- */

function sectionBounds(lines: string[], heading: Section): [number, number] {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (isSectionHeading(t, heading)) {
      start = i + 1;
      break;
    }
  }
  if (start === -1)
    throw new Error(`'## ${heading}' section missing from Movies.md`);
  let end = lines.length;
  for (let j = start; j < lines.length; j++) {
    if (lines[j].startsWith("## ")) {
      end = j;
      break;
    }
  }
  return [start, end];
}

interface Layout {
  contentStart: number;
  hasHeader: boolean;
  dataStart: number;
  dataEnd: number;
}

function layoutOf(lines: string[], start: number, end: number): Layout {
  let contentStart = start;
  while (contentStart < end && lines[contentStart].trim() === "")
    contentStart++;
  const hasHeader =
    contentStart < end &&
    isTableRow(lines[contentStart]) &&
    contentStart + 1 < end &&
    isDivider(lines[contentStart + 1]);
  const dataStart = hasHeader ? contentStart + 2 : contentStart;
  let dataEnd = dataStart;
  while (dataEnd < end && isTableRow(lines[dataEnd])) dataEnd++;
  return { contentStart, hasHeader, dataStart, dataEnd };
}

function readLines(): string[] {
  const path = configuredNotePath();
  if (!existsSync(path)) throw new Error(`Movies file not found: ${path}`);
  return readFileSync(path, "utf-8").split("\n");
}
function writeLines(lines: string[]): void {
  const path = configuredNotePath();
  const temporaryPath = join(
    dirname(path),
    `.${Date.now()}-${process.pid}.tmp`,
  );
  writeFileSync(temporaryPath, lines.join("\n"), "utf-8");
  renameSync(temporaryPath, path);
}

function rowsIn(lines: string[], section: Section): MediaItem[] {
  const [s, e] = sectionBounds(lines, section);
  const { dataStart, dataEnd } = layoutOf(lines, s, e);
  const out: MediaItem[] = [];
  for (let k = dataStart; k < dataEnd; k++) out.push(lineToRow(lines[k]));
  return out;
}

function findRow(
  lines: string[],
  section: Section,
  title: string,
): { idx: number; row: MediaItem } | null {
  const [s, e] = sectionBounds(lines, section);
  const { dataStart, dataEnd } = layoutOf(lines, s, e);
  for (let k = dataStart; k < dataEnd; k++) {
    const row = lineToRow(lines[k]);
    if (row.title.toLowerCase() === title.toLowerCase()) return { idx: k, row };
  }
  return null;
}

function insertRow(lines: string[], section: Section, it: MediaItem): void {
  const [s, e] = sectionBounds(lines, section);
  const lay = layoutOf(lines, s, e);
  if (!lay.hasHeader) {
    lines.splice(
      lay.contentStart,
      0,
      headerLine(),
      dividerLine(),
      rowToLine(it),
      "",
    );
  } else {
    lines.splice(lay.dataEnd, 0, rowToLine(it));
  }
}

function ensureSections(lines: string[]): boolean {
  let changed = false;
  for (const heading of SECTION_HEADINGS) {
    if (lines.some((line) => isSectionHeading(line, heading))) continue;
    if (lines.length > 0 && lines[lines.length - 1].trim() !== "")
      lines.push("");
    lines.push(`## ${heading}`, "");
    changed = true;
  }
  return changed;
}

function isSectionHeading(line: string, heading: Section): boolean {
  const normalized = line.trim().toLowerCase();
  return (
    normalized.startsWith("## ") && normalized.endsWith(heading.toLowerCase())
  );
}

function configuredNotePath(): string {
  const { notePath } = getPreferenceValues<Preferences>();
  if (!notePath?.trim()) {
    throw new Error("Choose your Movies.md file in the extension preferences");
  }
  return notePath.trim();
}

function findRowByIdentity(
  lines: string[],
  section: Section,
  title: string,
  imdbId = "",
): { idx: number; row: MediaItem } | null {
  const [s, e] = sectionBounds(lines, section);
  const { dataStart, dataEnd } = layoutOf(lines, s, e);
  for (let k = dataStart; k < dataEnd; k++) {
    const row = lineToRow(lines[k]);
    const sameId = imdbId && row.imdbId && row.imdbId === imdbId;
    const sameTitle = row.title.toLowerCase() === title.toLowerCase();
    if (sameId || sameTitle) return { idx: k, row };
  }
  return null;
}

/* ---------- public API ---------- */

export function loadMedia(): { watchlist: MediaItem[]; watched: MediaItem[] } {
  const lines = readLines();
  if (ensureSections(lines)) writeLines(lines);
  return {
    watchlist: rowsIn(lines, "Watchlist"),
    watched: rowsIn(lines, "Watched"),
  };
}

export function createNote(): void {
  const path = configuredNotePath();
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) {
    writeFileSync(path, INITIAL_NOTE, "utf-8");
    return;
  }
  const lines = readFileSync(path, "utf-8").split("\n");
  if (ensureSections(lines)) writeLines(lines);
}

export function getNotePath(): string {
  return configuredNotePath();
}

export function getObsidianUrl(): string | null {
  const path = configuredNotePath();
  let vaultRoot = dirname(path);
  while (vaultRoot !== dirname(vaultRoot)) {
    if (existsSync(join(vaultRoot, ".obsidian"))) {
      const file = relative(vaultRoot, path).split(sep).join("/");
      return `obsidian://open?vault=${encodeURIComponent(basename(vaultRoot))}&file=${encodeURIComponent(file)}`;
    }
    vaultRoot = dirname(vaultRoot);
  }
  return null;
}

export function exists(title: string, imdbId = ""): boolean {
  const lines = readLines();
  return (
    findRowByIdentity(lines, "Watchlist", title, imdbId) !== null ||
    findRowByIdentity(lines, "Watched", title, imdbId) !== null
  );
}

export function addItem(it: MediaItem, section: Section = "Watchlist"): void {
  if (!it.title.trim()) throw new Error("A title is required");
  const lines = readLines();
  ensureSections(lines);
  if (
    findRowByIdentity(lines, "Watchlist", it.title, it.imdbId) ||
    findRowByIdentity(lines, "Watched", it.title, it.imdbId)
  ) {
    throw new Error(`Already listed: ${it.title}`);
  }
  insertRow(lines, section, { ...it, watched: section === "Watched" });
  writeLines(lines);
}

export function updateItem(
  title: string,
  section: Section,
  patch: Partial<MediaItem>,
): void {
  const lines = readLines();
  const hit = findRow(lines, section, title);
  if (!hit) throw new Error(`Not found in ${section}: ${title}`);
  lines[hit.idx] = rowToLine({ ...hit.row, ...patch });
  writeLines(lines);
}

export function markWatched(title: string, myRating = "", notes = ""): void {
  const lines = readLines();
  const hit = findRow(lines, "Watchlist", title);
  if (!hit) throw new Error(`Not found in Watchlist: ${title}`);
  lines.splice(hit.idx, 1);
  insertRow(lines, "Watched", {
    ...hit.row,
    myRating: myRating.trim() || hit.row.myRating,
    notes: notes.trim() || hit.row.notes,
    watched: true,
  });
  writeLines(lines);
}

export function markUnwatched(title: string): void {
  const lines = readLines();
  const hit = findRow(lines, "Watched", title);
  if (!hit) throw new Error(`Not found in Watched: ${title}`);
  lines.splice(hit.idx, 1);
  insertRow(lines, "Watchlist", { ...hit.row, watched: false });
  writeLines(lines);
}

export function removeItem(title: string, from: Section): void {
  const lines = readLines();
  const hit = findRow(lines, from, title);
  if (!hit) throw new Error(`Not found: ${title}`);
  lines.splice(hit.idx, 1);
  writeLines(lines);
}
