export interface ManagedProfile {
  name: string;
  content: string;
}

export interface ManagedContent {
  /**
   * The always-on part of the file: the system's own hosts entries plus
   * everything else that is not the applied profile section.
   */
  commonContent: string;
  profile: ManagedProfile | null;
}

/**
 * Section header for the always-on part of the file. It doubles as the anchor of
 * the managed region: it opens the file, and everything that is not the applied
 * profile section belongs to the public configuration below it.
 */
export const COMMON_HEADER = "#-------- Public Configuration --------";

/**
 * Headers written by earlier versions. They still mark the start of the public
 * section, so an existing file is adopted instead of being written twice.
 */
const LEGACY_COMMON_HEADERS = ["#-------- public config --------"];

/** Markers written by earlier versions; kept only to migrate them away. */
const LEGACY_BEGIN_MARKER = "# ===== hosts-manager:BEGIN =====";
const LEGACY_END_MARKER = "# ===== hosts-manager:END =====";

/** Matches `#-------- <name> --------`, the shape of every section header. */
const SECTION_HEADER = /^#-------- (.+) --------$/;

/**
 * First line of a section Hosts Manager wrote. Section headers are plain text
 * that anyone can type, so ownership is proven with this marker instead of the
 * header shape alone: without it, a section the user wrote themselves could be
 * mistaken for the applied profile and replaced on the next write.
 */
export const OWNERSHIP_MARKER = "# Managed by Hosts Manager";

function isCommonHeader(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === COMMON_HEADER || LEGACY_COMMON_HEADERS.includes(trimmed);
}

/** Any section header other than the public one, i.e. a custom configuration. */
function isProfileHeader(line: string): boolean {
  return SECTION_HEADER.test(line.trim()) && !isCommonHeader(line);
}

function profileHeader(name: string): string {
  return `#-------- ${name} --------`;
}

/**
 * True when `name` would produce the header Hosts Manager reserves for the
 * public section, which would make the profile indistinguishable from it: the
 * parser would fold its entries into the public content, so cancelling or
 * deleting the profile could never remove them again.
 */
export function isReservedProfileName(name: string): boolean {
  return isCommonHeader(profileHeader(name.trim()));
}

function headerName(line: string): string {
  return SECTION_HEADER.exec(line.trim())?.[1]?.trim() ?? "";
}

/**
 * Index of the section Hosts Manager owns, or -1 when the file has none.
 *
 * Only the marker counts as ownership: a same-shaped header the user typed is
 * their content, and rewriting it would delete entries Hosts Manager never
 * wrote.
 */
function findManagedProfileIndex(lines: string[]): number {
  return lines.findIndex(
    (line, index) =>
      isProfileHeader(line) && lines[index + 1]?.trim() === OWNERSHIP_MARKER,
  );
}

/** Normalizes line endings and drops trailing blank lines so re-composing is stable. */
function contentLines(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  return normalized === "" ? [] : normalized.split("\n");
}

/**
 * Splits the file into the two kinds of content it holds: public content, i.e.
 * the user's original hosts entries, and the first `#-------- <name> --------`
 * section, which is a custom configuration. Anything past that section belongs
 * to the section, so custom entries never leak into the public content.
 */
export function parseManagedBlock(original: string): ManagedContent {
  const lines = removeLegacyBlock(original.replace(/\r\n/g, "\n").split("\n"));
  const profileIndex = findManagedProfileIndex(lines);
  const publicEnd = profileIndex === -1 ? lines.length : profileIndex;
  const commonContent = lines
    .slice(0, publicEnd)
    .filter((line) => !isCommonHeader(line))
    .join("\n")
    .trim();

  if (profileIndex === -1) {
    return { commonContent, profile: null };
  }

  const body = lines.slice(profileIndex + 1);
  if (body[0]?.trim() === OWNERSHIP_MARKER) body.shift();

  return {
    commonContent,
    profile: {
      name: headerName(lines[profileIndex]),
      content: body.join("\n").trim(),
    },
  };
}

/** Renders the whole file: public header, always-on content, applied profile. */
export function renderManagedBlock(content: ManagedContent): string {
  const lines = [COMMON_HEADER, ...contentLines(content.commonContent)];
  if (content.profile) {
    lines.push(
      "",
      profileHeader(content.profile.name),
      OWNERSHIP_MARKER,
      ...contentLines(content.profile.content),
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Drops a managed block written by an earlier version that used BEGIN/END markers. */
function removeLegacyBlock(lines: string[]): string[] {
  const beginIndex = lines.findIndex(
    (line) => line.trim() === LEGACY_BEGIN_MARKER,
  );
  if (beginIndex === -1) return lines;

  const endIndex = lines.findIndex(
    (line, index) => index > beginIndex && line.trim() === LEGACY_END_MARKER,
  );
  return [
    ...lines.slice(0, beginIndex),
    ...(endIndex === -1 ? [] : lines.slice(endIndex + 1)),
  ];
}
