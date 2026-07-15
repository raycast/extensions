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
 * - Localized headers: header detection prefers English column names; when the
 *   header has no recognizable English names, columns map to canonical keys BY
 *   POSITION using the calling command's expected shapes.
 * - Key-value output (`show`, `show --versions`).
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

const EXPLICIT_TARGETING_MARKER = /require explicit targeting/i;
const UNKNOWN_VERSION_MARKER = /version numbers that cannot be determined/i;
/** Footer/summary lines that are not data rows. */
const SUMMARY_LINE = /^\d+\s+(upgrades?|packages?|apps?)\s/i;

const ENGLISH_COLUMN_KEYWORDS = ["name", "id", "version", "available", "source", "match", "pin type"];

function isSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length >= 10 && /^[-\s]+$/.test(trimmed) && trimmed.includes("-");
}

/**
 * Detect column boundaries. Primary: dash-run boundaries in the separator
 * (works when the separator has gaps). Fallback 1: positions of known English
 * keywords in the header (pin list's solid separator). Fallback 2 (localized
 * headers): split the header on runs of 2+ spaces and map names by position
 * using `canonicalByCount`.
 */
function detectColumns(header: string, separator: string, canonicalByCount: Record<number, string[]>): TableColumn[] {
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

  // Fallback 1: English keyword positions (solid separator, e.g. pin list).
  // Word-boundary matches only ("Identifiant" must not match "id"), and the
  // result is only trusted when it found the columns the row mappers need.
  const lower = header.toLowerCase();
  const keywordColumns: TableColumn[] = [];
  for (const word of ENGLISH_COLUMN_KEYWORDS) {
    const match = new RegExp(`\\b${word.replace(" ", "\\s")}\\b`).exec(lower);
    if (match && !keywordColumns.some((c) => match.index >= c.start && match.index < c.start + c.name.length)) {
      keywordColumns.push({ name: word, start: match.index, end: -1 });
    }
  }
  keywordColumns.sort((a, b) => a.start - b.start);
  const keywordNames = new Set(keywordColumns.map((c) => c.name));
  if (keywordColumns.length >= 2 && keywordNames.has("name") && keywordNames.has("id")) {
    for (let j = 0; j < keywordColumns.length; j++) {
      keywordColumns[j]!.end = keywordColumns[j + 1]?.start ?? Math.max(header.length, separator.length);
    }
    return remapColumnsToCells(keywordColumns, header);
  }

  // Fallback 2: localized header — positions from runs of 2+ spaces.
  const positional: TableColumn[] = [];
  const matches = [...header.matchAll(/\S+(?:\s\S+)*?(?=\s{2,}|$)/g)];
  for (const match of matches) {
    if (match.index !== undefined && match[0].trim()) {
      positional.push({
        name: match[0].trim().toLowerCase(),
        start: match.index,
        end: -1,
      });
    }
  }
  for (let j = 0; j < positional.length; j++) {
    positional[j]!.end = positional[j + 1]?.start ?? Math.max(header.length, separator.length);
  }
  return canonicalizeColumns(remapColumnsToCells(positional, header), canonicalByCount, true);
}

/**
 * Header-derived offsets are code-unit indices, but rows are sliced by display
 * cells. For localized headers containing wide (CJK) characters the two
 * diverge — remap. Identity for ASCII headers.
 */
function remapColumnsToCells(columns: TableColumn[], header: string): TableColumn[] {
  if (!MAYBE_WIDE.test(header)) {
    return columns;
  }
  return columns.map((column, index) => ({
    ...column,
    start: codeUnitToCellOffset(header, column.start),
    // The header's display width understates how far row content may extend;
    // the last column always runs to the end of each row.
    end: index === columns.length - 1 ? Number.MAX_SAFE_INTEGER : codeUnitToCellOffset(header, column.end),
  }));
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
 */
function parseTableSections(output: string, canonicalByCount: Record<number, string[]>): TableSection[] {
  const lines = output.split(/\r?\n/);
  const sections: TableSection[] = [];
  let nextTag: SectionTag = "main";
  let current: { columns: TableColumn[]; section: TableSection } | null = null;

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
      const columns = detectColumns(line, next, canonicalByCount);
      if (columns.length >= 2) {
        const section: TableSection = { tag: nextTag, rows: [] };
        sections.push(section);
        current = { columns, section };
        i++; // skip separator
        continue;
      }
    }

    if (!current || isSeparatorLine(line)) {
      continue;
    }

    const row: Record<string, string> = {};
    for (const col of current.columns) {
      row[col.name] = sliceByDisplayCells(line, col.start, col.end).trim();
    }
    current.section.rows.push(row);
  }

  return sections;
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

function parsePackageDetails(output: string): WingetPackageDetails | null {
  const lines = output.split(/\r?\n/);
  const foundIndex = lines.findIndex((line) => /^Found\s+.+\[.+\]/.test(line));
  if (foundIndex === -1) return null;
  const headerMatch = lines[foundIndex]!.match(/^Found\s+(.+?)\s+\[(.+?)\]/);
  if (!headerMatch?.[1] || !headerMatch[2]) return null;

  const result: WingetPackageDetails = {
    id: headerMatch[2],
    name: headerMatch[1],
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

    const kv = line.match(/^([A-Za-z][A-Za-z\s]*?):\s*(.*)$/);
    if (!kv?.[1] || kv[2] === undefined) continue;

    const key = kv[1].toLowerCase().replace(/\s+/g, "");
    const value = kv[2].trim();

    switch (key) {
      case "version":
        result.version = value;
        break;
      case "publisher":
        result.publisher = value;
        break;
      case "author":
        result.author = value;
        break;
      case "moniker":
        result.moniker = value;
        break;
      case "homepage":
        result.homepage = value;
        break;
      case "license":
        result.license = value;
        break;
      case "releasedate":
        result.releaseDate = value;
        break;
      case "description":
        if (value) descriptionLines.push(value);
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
  const foundIndex = lines.findIndex((line) => /^Found\s+.+\[.+\]/.test(line));
  if (foundIndex === -1) return null;
  const headerMatch = lines[foundIndex]!.match(/^Found\s+(.+?)\s+\[(.+?)\]/);
  if (!headerMatch?.[1] || !headerMatch[2]) return null;

  const separatorIndex = lines.findIndex((l, i) => i > foundIndex && /^-+$/.test(l.trim()));
  if (separatorIndex === -1) return null;

  return {
    id: headerMatch[2],
    name: headerMatch[1],
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
      message: `Installer failed with exit code ${code}`,
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
