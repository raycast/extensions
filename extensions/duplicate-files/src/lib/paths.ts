import path from "path";

/**
 * Extensions that are conventionally treated as a single unit so that
 * `archive.tar.gz` splits into `archive` + `tar.gz` rather than `archive.tar` + `gz`.
 */
const COMPOUND_EXTENSIONS = ["tar.gz", "tar.bz2", "tar.xz", "tar.zst", "tar.lz", "tar.lzma", "user.js", "d.ts"];

export type SplitName = {
  /** File name without the extension. For directories and dotfiles this is the whole name. */
  stem: string;
  /** Extension without the leading dot, or an empty string when there is none. */
  ext: string;
};

/**
 * Splits a base name into stem and extension.
 * Directories never get an extension, and dotfiles like `.env` keep their full name as the stem.
 */
export function splitName(base: string, isDirectory = false): SplitName {
  if (isDirectory) {
    return { stem: base, ext: "" };
  }

  const lower = base.toLowerCase();
  for (const compound of COMPOUND_EXTENSIONS) {
    const suffix = `.${compound}`;
    if (lower.endsWith(suffix) && base.length > suffix.length) {
      return { stem: base.slice(0, -suffix.length), ext: base.slice(-compound.length) };
    }
  }

  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) {
    // No dot, a leading dot (`.env`), or a trailing dot: nothing usable to split off.
    return { stem: base, ext: "" };
  }

  return { stem: base.slice(0, dot), ext: base.slice(dot + 1) };
}

/** Rejoins a stem and extension, skipping the dot when there is no extension. */
export function joinName(stem: string, ext: string): string {
  return ext ? `${stem}.${ext}` : stem;
}

/** Characters that are illegal in file names on macOS or Windows. */
const ILLEGAL_CHARACTERS = /[<>:"/\\|?*]/g;

/** Names Windows refuses regardless of extension. */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Makes a rendered name safe to write to disk on both macOS and Windows.
 * Returns an empty string when nothing usable is left, so callers can report the problem.
 */
export function sanitizeName(name: string): string {
  const cleaned = name
    .replace(ILLEGAL_CHARACTERS, "-")
    .replace(/\s+/g, " ")
    .trim()
    // Windows silently strips trailing dots and spaces, which breaks round-tripping.
    .replace(/[. ]+$/, "");

  if (!cleaned) {
    return "";
  }

  const { stem, ext } = splitName(cleaned);
  return RESERVED_NAMES.test(stem) ? joinName(`${stem}_`, ext) : cleaned;
}

/** True when `name` is a single path component rather than a path or a traversal. */
export function isPlainFileName(name: string): boolean {
  return name.length > 0 && name !== "." && name !== ".." && !name.includes("/") && !name.includes(path.sep);
}
