/**
 * Text-level helpers for BibTeX. They work on the raw text, so everything the
 * user wrote (formatting, LaTeX, field order, comments) is kept as is.
 */

const NON_ENTRY_TYPES = new Set(["comment", "string", "preamble"]);
const ENTRY_START = /@\s*([A-Za-z]+)\s*([{(])/g;

interface EntryLocation {
  /** Index of the `@`. */
  start: number;
  /** Index of the opening delimiter, `{` or `(`. */
  open: number;
  /** Index of the matching closing delimiter. */
  close: number;
  key: string;
}

/** Index of the delimiter closing the entry opened at `open`. Handles nested braces and `"quoted"` values. */
function closingIndex(text: string, open: number): number {
  const closeChar = text[open] === "{" ? "}" : ")";
  let depth = 0;
  let inQuote = false;
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      depth++;
    } else if (c === "}") {
      if (depth === 0) {
        if (closeChar === "}") return i;
        throw new Error("Unbalanced braces in BibTeX entry");
      }
      depth--;
    } else if (c === '"' && depth === 0) {
      inQuote = !inQuote;
    } else if (c === ")" && closeChar === ")" && depth === 0 && !inQuote) {
      return i;
    }
  }
  throw new Error("BibTeX entry is not closed");
}

/**
 * Split an entry body into its top-level segments (the citation key, then one
 * per field). Each span covers the segment and the comma after it, if any.
 */
function topLevelSegments(text: string, from: number, to: number): { start: number; end: number }[] {
  const segments: { start: number; end: number }[] = [];
  let depth = 0;
  let inQuote = false;
  let segmentStart = from;
  for (let i = from; i < to; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === '"' && depth === 0) inQuote = !inQuote;
    else if (c === "," && depth === 0 && !inQuote) {
      segments.push({ start: segmentStart, end: i + 1 });
      segmentStart = i + 1;
    }
  }
  segments.push({ start: segmentStart, end: to });
  return segments;
}

/** All real entries in `text`, skipping `@comment`, `@string` and `@preamble` blocks. */
function* iterateEntries(text: string): Generator<EntryLocation> {
  const re = new RegExp(ENTRY_START.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const open = match.index + match[0].length - 1;
    if (NON_ENTRY_TYPES.has(match[1].toLowerCase())) {
      // Skip the whole block so an `@` inside a comment isn't read as an entry.
      try {
        re.lastIndex = closingIndex(text, open) + 1;
      } catch {
        // Unbalanced comment: keep scanning right after its opening.
      }
      continue;
    }
    const close = closingIndex(text, open);
    const [keySegment] = topLevelSegments(text, open + 1, close);
    const key = text.slice(keySegment.start, keySegment.end).replace(/,$/, "").trim();
    yield { start: match.index, open, close, key };
    re.lastIndex = close + 1;
  }
}

function firstEntry(text: string): EntryLocation {
  const { value } = iterateEntries(text).next();
  if (!value) {
    throw new Error("No BibTeX entry found");
  }
  return value;
}

/**
 * Return `bibtex` with its `file` field set to `{:<filename>:PDF}` (the JabRef
 * format). Any existing `file` field is removed first, whether it is braced,
 * quoted or spread over several lines.
 */
export function setFileField(bibtex: string, filename: string): string {
  let text = bibtex;
  const { open, close } = firstEntry(text);

  // Remove existing file fields, last first so earlier indices stay valid.
  const fileFields = topLevelSegments(text, open + 1, close)
    .slice(1)
    .filter(({ start, end }) => /^\s*file\s*=/i.test(text.slice(start, end)));
  for (const { start, end } of fileFields.reverse()) {
    text = text.slice(0, start) + text.slice(end);
  }

  const entry = firstEntry(text);
  let head = text.slice(0, entry.close).trimEnd();
  if (!head.endsWith(",")) {
    head += ",";
  }
  return `${head}\n  file = {:${filename}:PDF}\n${text.slice(entry.close)}`;
}

/**
 * Return `text` without the entry whose citation key is `key`, including the
 * whitespace after it. If several entries share the key, the one mentioning
 * `file` is removed.
 */
export function removeEntry(text: string, key: string, file?: string): string {
  const matches = [...iterateEntries(text)].filter((entry) => entry.key.toLowerCase() === key.toLowerCase());
  if (matches.length === 0) {
    throw new Error(`Entry "${key}" was not found in the .bib file`);
  }
  const target =
    (file && matches.find((entry) => text.slice(entry.start, entry.close + 1).includes(file))) || matches[0];

  let end = target.close + 1;
  while (end < text.length && /\s/.test(text[end])) {
    end++;
  }
  return text.slice(0, target.start) + text.slice(end);
}

// A local path ending in `.pdf`; source URLs (`https://…/paper.pdf`) don't count.
const isPdfPath = (s: string) => /\.pdf$/i.test(s) && !/^([a-z][a-z0-9+.-]*:)?\/\//i.test(s);

/**
 * The PDF paths in a `file` field. Accepts the JabRef form `description:path:type`
 * and looser variants (`paper.pdf`, `PDF:paper.pdf`, `paper.pdf:PDF`), with several
 * files separated by `;`. In each file, the colon-separated piece ending in `.pdf`
 * is taken as the path; files without one (notes, links, ...) are skipped.
 */
export function pdfAttachments(fileField: string): string[] {
  const paths: string[] = [];
  // `\;` and `\:` are escaped separators (JabRef), not real ones.
  for (const attachment of fileField.split(/(?<!\\);/)) {
    const raw = attachment.split(/(?<!\\):/).map((piece) => piece.replace(/\\([:;])/g, "$1").trim());

    // Re-join Windows drive letters split off at their colon, as in `C:\Papers\paper.pdf`.
    const pieces: string[] = [];
    for (let i = 0; i < raw.length; i++) {
      if (/^[A-Za-z]$/.test(raw[i]) && /^[\\/]/.test(raw[i + 1] ?? "")) {
        pieces.push(`${raw[i]}:${raw[++i]}`);
      } else {
        pieces.push(raw[i]);
      }
    }

    // Prefer the JabRef path position, in case the description also ends in `.pdf`.
    const path = pieces.length >= 3 && isPdfPath(pieces[1]) ? pieces[1] : pieces.find(isPdfPath);
    if (path) paths.push(path);
  }
  return paths;
}

// Letters that don't decompose into a base letter plus an accent.
const SPECIAL_LETTERS: Record<string, string> = {
  ł: "l",
  Ł: "L",
  ø: "o",
  Ø: "O",
  đ: "d",
  Đ: "D",
  ß: "ss",
  æ: "ae",
  Æ: "AE",
};

const stripDiacritics = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[łŁøØđĐßæÆ]/g, (c) => SPECIAL_LETTERS[c]);

/**
 * Text prepared for search: lowercase, without accents, so "groselj" finds "Grošelj".
 */
export const foldForSearch = (s: string): string => stripDiacritics(s).toLowerCase();

/** Keep only characters that are safe in a filename on every platform. */
export function filenamePart(s: string, maxLength = 40): string {
  return stripDiacritics(s)
    .replace(/[^A-Za-z0-9-]+/g, "")
    .slice(0, maxLength);
}

export function titleSlug(title: string): string {
  const base = stripDiacritics(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
  const slug = base.length > 60 ? base.slice(0, 60).replace(/_+$/g, "") : base;
  return slug || "untitled";
}

/** `Smith`, `Smith.Jones` or `Smith.etal`, built only from filename-safe characters. */
export function authorsPart(lastNames: string[]): string {
  const names = lastNames.map((name) => filenamePart(name)).filter(Boolean);
  if (names.length === 0) return "unknown";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}.${names[1]}`;
  return `${names[0]}.etal`;
}

export function yearPart(year: number): string {
  return Number.isInteger(year) && year > 0 ? String(year) : "undated";
}

/** A parsed entry, reduced to what duplicate detection needs. */
export interface EntryLike {
  key: string;
  fields: Record<string, unknown>;
}

const field = (entry: EntryLike, name: string): string => {
  const value = entry.fields[name];
  return typeof value === "string" ? value.trim() : "";
};

// ADS bibcodes are 19 characters: year, journal, volume, page, first-author initial.
const BIBCODE = /^\d{4}[A-Za-z&.][A-Za-z0-9&.]{13}[A-Za-z.]$/;

/** Ways the same paper can be recognized, even under a different citation key. */
function identifiers(entry: EntryLike): [kind: string, value: string][] {
  const ids: [string, string][] = [["citation key", entry.key.toLowerCase()]];

  const doi = field(entry, "doi")
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/, "");
  if (doi) ids.push(["DOI", doi]);

  const bibcodes = new Set<string>();
  const fromUrl = field(entry, "adsurl").match(/\/abs\/([^/?#]+)/);
  if (fromUrl) bibcodes.add(decodeURIComponent(fromUrl[1]));
  if (BIBCODE.test(entry.key)) bibcodes.add(entry.key);
  for (const bibcode of bibcodes) ids.push(["ADS bibcode", bibcode.toLowerCase()]);

  const eprint = field(entry, "eprint")
    .toLowerCase()
    .replace(/^arxiv:\s*/, "")
    .replace(/v\d+$/, "");
  if (eprint) ids.push(["arXiv ID", eprint]);

  // Short titles ("Introduction", "Erratum") are too generic to match on.
  const title = stripDiacritics(field(entry, "title"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (title.length >= 20) ids.push(["title", title]);

  return ids;
}

/** The library entry that is the same paper as `entry`, and how it was recognized. */
export function findDuplicate(entry: EntryLike, library: EntryLike[]): { key: string; reason: string } | undefined {
  const wanted = identifiers(entry);
  for (const existing of library) {
    const theirs = new Set(identifiers(existing).map(([kind, value]) => `${kind}\n${value}`));
    const match = wanted.find(([kind, value]) => theirs.has(`${kind}\n${value}`));
    if (match) {
      return { key: existing.key, reason: match[0] };
    }
  }
  return undefined;
}
