/**
 * WinGet CLI output parser.
 *
 * Handles:
 * - Fixed-width tables (search, list, upgrade, pin list), including MULTI-TABLE
 *   output: `winget upgrade` may emit a main table, then "The following packages
 *   have an upgrade available, but require explicit targeting for upgrade:" with
 *   its own header/separator/rows, then "…have version numbers that cannot be
 *   determined". Each section is parsed with its own column geometry.
 * - Truncation: winget formats for 120 columns when no console exists and
 *   truncates cells with "…" (U+2026). Verified live: names truncate often,
 *   versions sometimes (list/upgrade), IDs almost never. Cells are tagged; rows
 *   with truncated IDs are excluded (operations on them can never match).
 * - Localized headers: column detection is structural, not linguistic — one
 *   column per header token, boundaries validated against the data rows, then
 *   mapped to canonical keys BY POSITION using the calling command's expected
 *   shapes. English is just another locale. Row validation matters because
 *   winget separates columns by a SINGLE space when a localized header name is
 *   wider than the column's widest value (French "Disponible" vs "1.19.1").
 * - Key-value output (`show`, `show --versions`): labels are localized; they
 *   map to canonical keys via winget's own string tables (10 shipped locales).
 * - Operation result interpretation: EXIT-CODE-FIRST (exit codes are
 *   locale-independent HRESULTs; winget localizes all prose). English text
 *   patterns only refine messages and detect no-ops on exit 0.
 */

import { getExitCodeInfo, toUnsignedHResult } from "./errors";
import {
  type TruncatedField,
  type WingetInstalledPackage,
  type WingetOperationResult,
  type WingetPackageDetails,
  type WingetPinnedPackage,
  type WingetSearchPackage,
  type WingetSource,
  type WingetUpgradePackage,
  type WingetVersionList,
} from "./types";

// ============================================================================
// Helpers
// ============================================================================

const ELLIPSIS = "…";

type TableColumn = { name: string; start: number; end: number };

type FailureInfo = {
  message: string;
  errorCode?: string;
  installerLogPath?: string;
};

function cleanVersion(version: string): string {
  return version.startsWith("< ") ? version.slice(2) : version;
}

function normalizeErrorCode(raw: string): string {
  const normalized = raw.trim();
  if (/^0x[0-9a-f]+$/i.test(normalized)) return `0x${normalized.slice(2).toUpperCase()}`;
  return normalized;
}

function isValidSource(source: string | undefined): source is WingetSource {
  return source === "winget" || source === "msstore";
}

function isCellTruncated(value: string | undefined): boolean {
  return !!value && value.trimEnd().endsWith(ELLIPSIS);
}

// ---------------------------------------------------------------------------
// Display-width-aware slicing
//
// winget aligns table columns by DISPLAY width (CJK characters occupy two
// cells), while JS string indices count UTF-16 code units. Header lines are
// ASCII, so column offsets are display-cell offsets; rows containing wide
// characters must be sliced by walking cells, or every column after a CJK name
// shifts and the row is silently dropped.
// ---------------------------------------------------------------------------

function isWideCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0xa4cf) || // CJK Radicals … Yi
    (cp >= 0xa960 && cp <= 0xa97f) || // Hangul Jamo Extended-A
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
    (cp >= 0xfe10 && cp <= 0xfe19) || // Vertical forms
    (cp >= 0xfe30 && cp <= 0xfe6f) || // CJK Compatibility Forms
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) || // Emoji & symbols
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK Extensions B+
  );
}

const MAYBE_WIDE = /[ᄀ-ᅟ⺀-꓏ꥠ-꥿가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦\u{1f300}-\u{1faff}\u{20000}-\u{3fffd}]/u;

/** Convert a code-unit index within `line` to its display-cell offset. */
function codeUnitToCellOffset(line: string, codeUnitIndex: number): number {
  if (!MAYBE_WIDE.test(line)) {
    return codeUnitIndex;
  }
  let cell = 0;
  let index = 0;
  for (const char of line) {
    if (index >= codeUnitIndex) {
      break;
    }
    cell += isWideCodePoint(char.codePointAt(0)!) ? 2 : 1;
    index += char.length;
  }
  return cell;
}

/** Slice `line` between display-cell offsets [startCell, endCell). */
function sliceByDisplayCells(line: string, startCell: number, endCell: number): string {
  if (!MAYBE_WIDE.test(line)) {
    return line.substring(startCell, endCell);
  }
  let cell = 0;
  let startIndex = -1;
  let endIndex = line.length;
  let index = 0;
  for (const char of line) {
    if (startIndex === -1 && cell >= startCell) {
      startIndex = index;
    }
    if (cell >= endCell) {
      endIndex = index;
      break;
    }
    cell += isWideCodePoint(char.codePointAt(0)!) ? 2 : 1;
    index += char.length;
  }
  if (startIndex === -1) {
    startIndex = cell >= startCell ? line.length : line.length;
  }
  return line.substring(startIndex, endIndex);
}

function stripEllipsis(value: string): string {
  const trimmed = value.trimEnd();
  return trimmed.endsWith(ELLIPSIS) ? trimmed.slice(0, -1) : value;
}

// ============================================================================
// Sectioned fixed-width table parsing
// ============================================================================

type SectionTag = "main" | "explicit-targeting" | "unknown-version";

interface TableSection {
  tag: SectionTag;
  rows: Record<string, string>[];
}

interface ParseStats {
  /** Rows excluded because their ID cell was truncated by winget. */
  droppedTruncatedIds: number;
}

// Section markers are English prose. On localized systems they simply don't
// match: the sections still parse (each has its own header/separator), the
// rows just carry the default "main" tag. That costs nothing functionally —
// the explicit-targeting tag is informational, and the unknown-version table
// only appears under --include-unknown, which no command here passes.
const EXPLICIT_TARGETING_MARKER = /require explicit targeting/i;
const UNKNOWN_VERSION_MARKER = /version numbers that cannot be determined/i;
/** Footer/summary lines that are not data rows. */
const SUMMARY_LINE = /^\d+\s+(upgrades?|packages?|apps?)\s/i;

const ENGLISH_COLUMN_KEYWORDS = ["name", "id", "version", "available", "source", "match", "pin type"];

function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length >= 10 && /^[-\s]+$/.test(trimmed) && trimmed.includes("-");
}

/** True when the display cell `cell` of `line` is blank or past the end. */
function cellIsBlank(line: string, cell: number): boolean {
  return sliceByDisplayCells(line, cell, cell + 1).trim() === "";
}

/**
 * Detect column boundaries, without depending on the header's language.
 * Primary: dash-run boundaries in the separator (exact, but winget's
 * separators are usually one solid run). Otherwise: one column per header
 * token, boundaries validated against the data rows, mapped to canonical keys
 * by position using `canonicalByCount`.
 */
function detectColumns(
  header: string,
  separator: string,
  rowLines: string[],
  canonicalByCount: Record<number, string[]>,
): TableColumn[] {
  // Primary: gaps in the dashes give exact boundaries.
  const dashColumns: TableColumn[] = [];
  let i = 0;
  while (i < separator.length) {
    if (separator[i] === "-") {
      const start = i;
      while (i < separator.length && separator[i] === "-") i++;
      const name = header.substring(start, i).trim().toLowerCase();
      dashColumns.push({ name, start, end: i });
    } else {
      i++;
    }
  }
  if (dashColumns.length >= 2) {
    return canonicalizeColumns(dashColumns, canonicalByCount);
  }

  // Positional detection: every header token opens a column when either
  // criterion holds.
  // - A run of 2+ spaces before the token. Column names never contain double
  //   spaces, so this is always a boundary — but winget separates columns by
  //   a SINGLE space when the header name is wider than the column's widest
  //   value (French "Disponible" vs "1.19.1"), so its absence proves nothing.
  // - The rows confirm it: the display cell before the token is blank in
  //   every row (true boundaries are padded in every row) AND some row has
  //   content starting at the token (winget left-aligns values at the column
  //   start, and drops columns with no values at all). Both checks are
  //   needed: "Pin type"'s second word usually has row content beneath it,
  //   but "Tipo de anclaje"'s third word starts beyond the widest value, so
  //   only the content-at-start check rules it out. Prose lines (localized
  //   "2 upgrades available.") never align to columns, so only lines with a
  //   2+ space run get a vote.
  const voters = rowLines.filter((line) => /\S\s{2,}\S/.test(line));
  const positional: TableColumn[] = [];
  for (const token of header.matchAll(/\S+/g)) {
    const cellStart = codeUnitToCellOffset(header, token.index);
    const isBoundary =
      positional.length === 0 ||
      /\s{2,}$/.test(header.slice(0, token.index)) ||
      (voters.length > 0 &&
        voters.every((line) => cellIsBlank(line, cellStart - 1)) &&
        voters.some((line) => !cellIsBlank(line, cellStart)));
    if (isBoundary) {
      positional.push({ name: token[0].toLowerCase(), start: cellStart, end: -1 });
    } else {
      const previous = positional[positional.length - 1]!;
      previous.name = `${previous.name} ${token[0].toLowerCase()}`;
    }
  }
  for (let j = 0; j < positional.length; j++) {
    positional[j]!.end = positional[j + 1]?.start ?? Number.MAX_SAFE_INTEGER;
  }
  return canonicalizeColumns(positional, canonicalByCount, true);
}

/** Map detected columns to canonical names by position when names aren't English. */
function canonicalizeColumns(
  columns: TableColumn[],
  canonicalByCount: Record<number, string[]>,
  force = false,
): TableColumn[] {
  const englishHits = columns.filter((c) => ENGLISH_COLUMN_KEYWORDS.includes(c.name)).length;
  if (!force && englishHits >= 2) {
    return columns;
  }
  const canonical = canonicalByCount[columns.length];
  if (!canonical) {
    return columns;
  }
  return columns.map((column, index) => ({
    ...column,
    name: canonical[index] ?? column.name,
  }));
}

/**
 * Split output into table sections. A section starts at a header line followed
 * by a separator line; its tag comes from marker text seen since the previous
 * section. Lines before the first header and summary/marker lines are skipped.
 * Row lines are collected BEFORE column detection: localized headers need the
 * rows to resolve single-space column boundaries.
 */
function parseTableSections(output: string, canonicalByCount: Record<number, string[]>): TableSection[] {
  interface RawSection {
    tag: SectionTag;
    header: string;
    separator: string;
    rowLines: string[];
  }

  const lines = output.split(/\r?\n/);
  const rawSections: RawSection[] = [];
  let nextTag: SectionTag = "main";
  let current: RawSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) {
      continue;
    }
    if (EXPLICIT_TARGETING_MARKER.test(line)) {
      nextTag = "explicit-targeting";
      current = null;
      continue;
    }
    if (UNKNOWN_VERSION_MARKER.test(line)) {
      nextTag = "unknown-version";
      current = null;
      continue;
    }
    if (SUMMARY_LINE.test(line.trim())) {
      continue;
    }

    // A new section begins wherever a line is followed by a separator.
    const next = lines[i + 1];
    if (next !== undefined && isSeparatorLine(next) && !isSeparatorLine(line)) {
      current = { tag: nextTag, header: line, separator: next, rowLines: [] };
      rawSections.push(current);
      i++; // skip separator
      continue;
    }

    if (!current || isSeparatorLine(line)) {
      continue;
    }
    current.rowLines.push(line);
  }

  return rawSections.map(({ tag, header, separator, rowLines }) => {
    const section: TableSection = { tag, rows: [] };
    const columns = detectColumns(header, separator, rowLines, canonicalByCount);
    if (columns.length >= 2) {
      for (const line of rowLines) {
        const row: Record<string, string> = {};
        for (const col of columns) {
          row[col.name] = sliceByDisplayCells(line, col.start, col.end).trim();
        }
        section.rows.push(row);
      }
    }
    return section;
  });
}

/** Collect truncated-field tags for a row. */
function truncatedFieldsOf(row: Record<string, string>): TruncatedField[] | undefined {
  const fields: TruncatedField[] = [];
  for (const field of ["name", "id", "version", "available"] as const) {
    if (isCellTruncated(row[field])) {
      fields.push(field);
    }
  }
  return fields.length > 0 ? fields : undefined;
}

interface TableParseResult<T> {
  items: T[];
  stats: ParseStats;
}

function mapSections<T>(
  output: string,
  canonicalByCount: Record<number, string[]>,
  mapper: (row: Record<string, string>, tag: SectionTag) => T | null,
): TableParseResult<T> {
  const stats: ParseStats = { droppedTruncatedIds: 0 };
  const items: T[] = [];
  for (const section of parseTableSections(output, canonicalByCount)) {
    for (const row of section.rows) {
      if (isCellTruncated(row.id)) {
        // A truncated ID can never be targeted with --exact; drop the row.
        stats.droppedTruncatedIds++;
        continue;
      }
      const mapped = mapper(row, section.tag);
      if (mapped !== null) {
        items.push(mapped);
      }
    }
  }
  return { items, stats };
}

const SEARCH_CANONICAL: Record<number, string[]> = {
  4: ["name", "id", "version", "source"],
  5: ["name", "id", "version", "match", "source"],
};
const LIST_CANONICAL: Record<number, string[]> = {
  4: ["name", "id", "version", "source"],
  5: ["name", "id", "version", "available", "source"],
};
const UPGRADE_CANONICAL: Record<number, string[]> = {
  5: ["name", "id", "version", "available", "source"],
};
const PIN_CANONICAL: Record<number, string[]> = {
  4: ["name", "id", "version", "source"],
  5: ["name", "id", "version", "source", "pin type"],
};

function parseSearchResults(output: string): TableParseResult<WingetSearchPackage> {
  return mapSections(output, SEARCH_CANONICAL, (row) => {
    const source = row.source?.toLowerCase();
    if (!isValidSource(source)) return null;
    return {
      name: stripEllipsis(row.name || ""),
      id: row.id || "",
      version: row.version || "",
      source,
      truncatedFields: truncatedFieldsOf(row),
    };
  });
}

function parseInstalledPackages(output: string): TableParseResult<WingetInstalledPackage> {
  return mapSections(output, LIST_CANONICAL, (row) => {
    const source = row.source?.toLowerCase();
    if (!isValidSource(source)) return null;
    return {
      name: stripEllipsis(row.name || ""),
      id: row.id || "",
      version: cleanVersion(row.version || ""),
      available: row.available || undefined,
      source,
      truncatedFields: truncatedFieldsOf(row),
    };
  });
}

function parseUpgradePackages(output: string): TableParseResult<WingetUpgradePackage> {
  return mapSections(output, UPGRADE_CANONICAL, (row, tag) => {
    if (tag === "unknown-version") return null;
    const source = row.source?.toLowerCase();
    if (!isValidSource(source) || !row.available) return null;
    return {
      name: stripEllipsis(row.name || ""),
      id: row.id || "",
      version: cleanVersion(row.version || ""),
      available: row.available,
      source,
      truncatedFields: truncatedFieldsOf(row),
      ...(tag === "explicit-targeting" ? { requiresExplicitTargeting: true } : {}),
    };
  });
}

function parsePinnedPackages(output: string): TableParseResult<WingetPinnedPackage> {
  return mapSections(output, PIN_CANONICAL, (row) => {
    if (!row.id) return null;
    const source = row.source?.toLowerCase();
    if (!isValidSource(source)) return null;
    return { id: row.id, version: row.version || undefined, source };
  });
}

// ============================================================================
// Key-value parsing (show, show --versions)
// ============================================================================

/**
 * The identity line opening every `show` output is `<verb> <name> [<id>]`.
 * The verb is localized ("Found", "Trouvé", "Gefunden", "已找到", …) but the
 * shape is not: winget prints its localized label, a space, then `name [id]`.
 * IDs never contain whitespace, which keeps prose lines from matching.
 */
const IDENTITY_LINE = /^(\S+)\s+(.+?)\s+\[(\S+)\]/;

type DetailField =
  | "version"
  | "publisher"
  | "author"
  | "moniker"
  | "homepage"
  | "license"
  | "releasedate"
  | "description"
  | "tags";

/** Lowercase, collapse whitespace, drop a trailing colon (half- or fullwidth). */
function normalizeShowLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[:：]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `winget show` localizes its field labels (the colon is part of the label
 * string, and can be fullwidth or, for Korean's homepage, absent). This maps
 * the labels of winget's 10 shipped locales, taken from its own string
 * tables, to canonical fields; unknown labels are ignored.
 */
const SHOW_LABELS = new Map<string, DetailField>();
for (const [field, labels] of Object.entries({
  version: ["Version", "Versión", "Versione", "Versão", "バージョン", "버전", "Версия", "版本"],
  publisher: [
    "Publisher",
    "Herausgeber",
    "Editor",
    "Editore",
    "Fornecedor",
    "公開元",
    "게시자",
    "Издатель",
    "发布者",
    "發行者",
  ],
  author: ["Author", "Auteur", "Autor", "Autore", "作成者", "만든 이", "Автор", "作者"],
  moniker: ["Moniker", "モニカー", "모니커", "Моникер", "绰号", "綽號"],
  homepage: [
    "Homepage",
    "Page d’accueil",
    "Startseite",
    "Página principal",
    "Home page",
    "ホーム ページ",
    "홈페이지",
    "Página inicial",
    "Домашняя страница",
    "主页",
    "首頁",
  ],
  license: [
    "License",
    "Licence",
    "Lizenz",
    "Licencia",
    "Licenza",
    "ライセンス",
    "라이선스",
    "Licença",
    "Лицензия",
    "许可证",
    "授权",
  ],
  releasedate: [
    "Release Date",
    "Date de version",
    "Freigabedatum",
    "Fecha de lanzamiento",
    "Data di rilascio",
    "リリース日",
    "릴리스 날짜",
    "Data do Lançamento",
    "Дата выпуска",
    "发布日期",
    "發行日期",
  ],
  description: [
    "Description",
    "Beschreibung",
    "Descripción",
    "Descrizione",
    "説明",
    "설명",
    "Descrição",
    "Описание",
    "描述",
  ],
  tags: ["Tags", "Mots-clés", "Markierungen", "Etiquetas", "Tag", "タグ", "태그", "Marcas", "标记", "標記"],
} satisfies Record<DetailField, string[]>)) {
  for (const label of labels) {
    SHOW_LABELS.set(normalizeShowLabel(label), field as DetailField);
  }
}

/**
 * Korean's homepage label carries no colon at all ("홈페이지 https://…"). Only
 * these labels may match without one; matching any known label as a bare
 * prefix would let "Publisher Support Url: …" swallow the publisher field.
 */
const COLONLESS_SHOW_LABELS = new Map<string, DetailField>([["홈페이지", "homepage"]]);

/** Match a top-level `Label: value` line against the known localized labels. */
function matchShowLabel(line: string): { field: DetailField; value: string } | null {
  if (/^\s/.test(line)) return null;
  const colonIndex = line.search(/[:：]/);
  if (colonIndex !== -1) {
    const field = SHOW_LABELS.get(normalizeShowLabel(line.slice(0, colonIndex)));
    if (field) {
      return { field, value: line.slice(colonIndex + 1).trim() };
    }
  }
  const firstSpace = line.indexOf(" ");
  if (firstSpace !== -1) {
    const field = COLONLESS_SHOW_LABELS.get(line.slice(0, firstSpace));
    if (field) {
      return { field, value: line.slice(firstSpace + 1).trim() };
    }
  }
  return null;
}

function parsePackageDetails(output: string): WingetPackageDetails | null {
  const lines = output.split(/\r?\n/);
  const foundIndex = lines.findIndex((line) => IDENTITY_LINE.test(line));
  if (foundIndex === -1) return null;
  const headerMatch = lines[foundIndex]!.match(IDENTITY_LINE);
  if (!headerMatch?.[2] || !headerMatch[3]) return null;

  const result: WingetPackageDetails = {
    id: headerMatch[3],
    name: headerMatch[2],
    version: "",
  };
  let collecting: "description" | "tags" | null = null;
  const tags: string[] = [];
  const descriptionLines: string[] = [];

  for (let i = foundIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (collecting === "description") {
      if (line.startsWith("  ") || line.startsWith("\t")) {
        descriptionLines.push(line.trim());
        continue;
      }
      collecting = null;
    }
    if (collecting === "tags") {
      if (line.startsWith("    ") || line.startsWith("\t")) {
        tags.push(line.trim());
        continue;
      }
      if (line.trim() && !line.includes(":")) {
        tags.push(line.trim());
        continue;
      }
      collecting = null;
    }

    const kv = matchShowLabel(line);
    if (!kv) continue;

    switch (kv.field) {
      case "version":
        result.version = kv.value;
        break;
      case "publisher":
        result.publisher = kv.value;
        break;
      case "author":
        result.author = kv.value;
        break;
      case "moniker":
        result.moniker = kv.value;
        break;
      case "homepage":
        result.homepage = kv.value;
        break;
      case "license":
        result.license = kv.value;
        break;
      case "releasedate":
        result.releaseDate = kv.value;
        break;
      case "description":
        if (kv.value) descriptionLines.push(kv.value);
        collecting = "description";
        break;
      case "tags":
        collecting = "tags";
        break;
    }
  }

  if (descriptionLines.length > 0) result.description = descriptionLines.join("\n");
  if (tags.length > 0) result.tags = tags;
  return result;
}

function parseVersionList(output: string): WingetVersionList | null {
  const lines = output.split(/\r?\n/).filter((l) => l.trim());
  const foundIndex = lines.findIndex((line) => IDENTITY_LINE.test(line));
  if (foundIndex === -1) return null;
  const headerMatch = lines[foundIndex]!.match(IDENTITY_LINE);
  if (!headerMatch?.[2] || !headerMatch[3]) return null;

  const separatorIndex = lines.findIndex((l, i) => i > foundIndex && /^-+$/.test(l.trim()));
  if (separatorIndex === -1) return null;

  return {
    id: headerMatch[3],
    name: headerMatch[2],
    versions: lines
      .slice(separatorIndex + 1)
      .map((l) => l.trim())
      .filter(Boolean),
  };
}

// ============================================================================
// Operation result interpretation — exit-code-first
// ============================================================================

/**
 * English text catalogs. These REFINE messages and detect exit-0 no-ops; they
 * never decide success on their own (winget localizes prose — exit codes are
 * the authoritative, locale-independent signal).
 */
const NOOP_PATTERNS = [
  "No available upgrade found",
  "No newer package versions are available",
  "already installed",
] as const;

const FAILURE_PATTERNS: ReadonlyArray<{
  match: string | string[];
  message: string;
}> = [
  // Package not found
  {
    match: ["No installed package found", "No package found matching input criteria"],
    message: "Package not found",
  },
  // Upgrade blockers
  {
    match: "install technology is different",
    message: "Installer type changed, uninstall first",
  },
  {
    match: "does not apply to your system or requirements",
    message: "Newer version not compatible with this system",
  },
  { match: "package has a pin that prevents", message: "Blocked by pin" },
  {
    match: "cannot be upgraded using winget",
    message: "Not upgradable via WinGet",
  },
  // Installer issues
  {
    match: "No applicable installer found",
    message: "No compatible installer found",
  },
  {
    match: "Installer hash does not match",
    message: "Installer hash mismatch",
  },
  {
    match: "installer is blocked by policy",
    message: "Installer blocked by policy",
  },
  {
    match: ["installer failed security check", "anti-virus product reports"],
    message: "Blocked by security/antivirus",
  },
  {
    match: "cannot be run from an administrator context",
    message: "Cannot run as admin, run Raycast unelevated",
  },
  // Portable packages
  {
    match: "Unable to remove Portable package as it has been modified",
    message: "Portable package was modified since install",
  },
  // Repair
  {
    match: ["does not support repair", "repair command for this package cannot be found"],
    message: "Repair not supported",
  },
  // Permissions. "Access is denied" is deliberately NOT in the
  // requires-administrator class: it usually indicates a locked file or ACL
  // problem, and the curated message gates the elevation retry in commands.ts.
  {
    match: ["requires elevation", "requires administrator", "administrator privileges"],
    message: "Requires administrator, retry from an elevated terminal",
  },
  { match: "Access is denied", message: "Access denied" },
  // Concurrent / in-use
  {
    match: "Another install is already in progress",
    message: "Another install in progress",
  },
  {
    match: [
      "currently running. Exit the application",
      "currently in use",
      "Package in use",
      "Files modified by the installer are currently in use",
    ],
    message: "App in use, close it first",
  },
  // Resources
  {
    match: ["no more space", "Insufficient disk space", "disk full"],
    message: "Disk full",
  },
  { match: "not enough memory", message: "Out of memory" },
  // Network
  {
    match: "requires internet connectivity",
    message: "No internet connection",
  },
  // Policy / agreements
  {
    match: "Organization policies are preventing",
    message: "Blocked by org policy",
  },
  {
    match: "Package agreements were not agreed to",
    message: "License not accepted",
  },
  {
    match: "source agreements were not agreed to",
    message: "Source agreement not accepted",
  },
  // Uninstall
  {
    match: "cannot locate the uninstall command",
    message: "Uninstaller not found",
  },
  {
    match: "Multiple versions of this package are installed",
    message: "Multiple versions installed, uninstall each version from Show Installed",
  },
  // Reboot
  {
    match: ["Restart your PC to finish", "PC will restart to finish"],
    message: "Restart required",
  },
  // Archive
  { match: "Failed to extract", message: "Archive extraction failed" },
];

/**
 * Phase-completion markers. Used to disambiguate exit-0 outputs that BEGIN with
 * an "already installed" preamble: `winget install` of an installed package
 * prints "Found an existing package already installed. Trying to upgrade the
 * installed package..." and may then genuinely upgrade — that is a success,
 * not a no-op. A no-op is "already installed" prose WITHOUT any completed work.
 */
const COMPLETION_MARKERS = [
  "Successfully installed",
  "Successfully uninstalled",
  "Repair operation completed",
  "Installer downloaded:",
] as const;

function isNoopOutput(buffer: string): boolean {
  return (
    NOOP_PATTERNS.some((pattern) => buffer.includes(pattern)) &&
    !COMPLETION_MARKERS.some((marker) => buffer.includes(marker))
  );
}

function extractFailureMessage(buffer: string): string | undefined {
  for (const { match, message } of FAILURE_PATTERNS) {
    const patterns = typeof match === "string" ? [match] : match;
    if (patterns.some((p) => buffer.includes(p))) return message;
  }

  if (buffer.includes("Microsoft Store") && buffer.includes("blocked by policy")) return "Store app blocked by policy";

  const m = buffer.match(/(?:Uninstall|Install(?:ation)?|Upgrade|Repair) failed[^\n]*/i);
  return m?.[0]?.trim();
}

/**
 * Installer exit codes with a fixed, documented meaning (Windows Installer
 * error codes — MSI installers relay them verbatim). Only codes that are
 * unambiguous across installer technologies belong here; generic codes like
 * 1 or 2 mean different things per installer and stay unmapped.
 */
const WELL_KNOWN_INSTALLER_EXIT_CODES: Record<string, string> = {
  "1602": "Cancelled by the user",
  "1603": "Installer reported a fatal error",
  "1618": "Another installation is already in progress, retry later",
  "1638": "Another version of this product is already installed",
};

function extractFailureInfo(buffer: string): FailureInfo | null {
  const installerLogPath = buffer.match(/Installer log is available at:\s*([^\r\n]+)/i)?.[1]?.trim();

  // "0x8A15000F : Data required by the source is missing"
  const errorMatch = buffer.match(/(?:^|\r?\n)\s*(0x[0-9a-f]+|-?\d+)\s*:\s*([^\r\n]+)/i);
  if (errorMatch?.[1] && errorMatch[2]) {
    return {
      message: errorMatch[2].trim(),
      errorCode: normalizeErrorCode(errorMatch[1]),
      installerLogPath,
    };
  }

  // "Installer failed with exit code: 2"
  const exitCodeMatch = buffer.match(/Installer failed with exit code:\s*([^\r\n]+)/i);
  if (exitCodeMatch?.[1]) {
    const code = normalizeErrorCode(exitCodeMatch[1]);
    return {
      message: WELL_KNOWN_INSTALLER_EXIT_CODES[code] ?? `Installer failed with exit code ${code}`,
      errorCode: code,
      installerLogPath,
    };
  }

  return installerLogPath ? { message: "", installerLogPath } : null;
}

function extractDownloadPath(buffer: string): string | undefined {
  return buffer.match(/Installer downloaded:\s*(.+)/)?.[1]?.trim();
}

/**
 * Interpret a finished operation. Success/noop/failure is decided by the exit
 * code (0 = success; mapped HRESULTs classify noops and known failures); the
 * output buffer refines messages, detects exit-0 no-ops, and carries error
 * details (installer log path, embedded HRESULT lines).
 */
function interpretOperationResult(exitCode: number, buffer: string): WingetOperationResult {
  const downloadPath = extractDownloadPath(buffer);

  if (exitCode === 0) {
    const noop = isNoopOutput(buffer);
    return { success: true, noop, exitCode, downloadPath };
  }

  const info = getExitCodeInfo(exitCode);
  if (info?.kind === "noop") {
    return {
      success: true,
      noop: true,
      message: info.message,
      exitCode,
      downloadPath,
    };
  }
  if (info?.kind === "success") {
    return {
      success: true,
      noop: false,
      message: info.message,
      exitCode,
      downloadPath,
    };
  }
  if (info?.kind === "cancelled") {
    return {
      success: false,
      cancelled: true,
      message: info.message,
      exitCode,
      downloadPath,
    };
  }

  const failureInfo = extractFailureInfo(buffer);
  const message =
    extractFailureMessage(buffer) ??
    (failureInfo?.message ? failureInfo.message : undefined) ??
    info?.message ??
    `WinGet exited with code 0x${toUnsignedHResult(exitCode).toString(16).toUpperCase()}`;

  return {
    success: false,
    message,
    exitCode,
    downloadPath,
    errorCode: failureInfo?.errorCode ?? `0x${toUnsignedHResult(exitCode).toString(16).toUpperCase()}`,
    installerLogPath: failureInfo?.installerLogPath,
  };
}

export {
  extractFailureInfo,
  extractFailureMessage,
  interpretOperationResult,
  isNoopOutput,
  parseInstalledPackages,
  parsePackageDetails,
  parsePinnedPackages,
  parseSearchResults,
  parseTableSections,
  parseUpgradePackages,
  parseVersionList,
  type FailureInfo,
  type ParseStats,
  type SectionTag,
  type TableParseResult,
};
