import path from "node:path";

export type TypeFilter = "all" | "directory" | "file";

export type ParsedQuery = {
  /** Whitespace-separated terms, all of which must match. */
  tokens: string[];
  /** Restrict results to folders or files. */
  type: TypeFilter;
  /** Extensions from `ext:pdf`, lower-cased and without the dot. */
  extensions: string[];
  /** Epoch ms bounds from `after:` / `before:`. */
  after?: number;
  before?: number;
  /** Byte bounds from `size:>10mb` / `size:<1kb`. */
  minSize?: number;
  maxSize?: number;
  /** The most selective token, used as the Spotlight query. */
  longest: string;
  /** Normalized whole query — the key under which abbreviations are learned. */
  normalized: string;
  /** True if any directive or attribute filter was recognized. */
  hasFilters: boolean;
  /** A term began with a dot, so hidden entries are wanted. */
  hidden: boolean;
};

/** True when a bare dot requests hidden entries without a name term. */
export function hiddenOnly(parsed: ParsedQuery): boolean {
  return parsed.hidden && parsed.tokens.length === 0;
}

/** Supported file and directory directives. */
const DIRECTORY_DIRECTIVE = /^(?:\^|-|:)(?:d|dir|directory|folder)$/i;
const FILE_DIRECTIVE = /^(?:\^|-|:)(?:f|file)$/i;

/** Incomplete filters ignored while the user is typing. */
const DIRECTIVE_WORDS = ["d", "dir", "directory", "folder", "f", "file"];
const PARTIAL_DIRECTIVE = /^[-^:]([a-z]*)$/i;
const PARTIAL_ATTRIBUTE = /^(ext|after|before|size):/i;

const EXT_FILTER = /^ext:(.+)$/i;
const AFTER_FILTER = /^after:(.+)$/i;
const BEFORE_FILTER = /^before:(.+)$/i;
const SIZE_FILTER = /^size:([<>])(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/i;

const SIZE_UNITS: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
};

/** Accepts 2026, 2026-08 or 2026-08-21. Returns epoch ms, or undefined. */
function parseDate(raw: string): number | undefined {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(raw.trim());
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : 1;
  const day = m[3] ? Number(m[3]) : 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const t = Date.UTC(year, month - 1, day);
  const date = new Date(t);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? t
    : undefined;
}

export function parseQuery(raw: string): ParsedQuery {
  const tokens: string[] = [];
  const extensions: string[] = [];
  let type: TypeFilter = "all";
  let after: number | undefined;
  let before: number | undefined;
  let minSize: number | undefined;
  let maxSize: number | undefined;
  let hasFilters = false;
  let hidden = false;

  for (const word of raw.trim().split(/\s+/)) {
    if (word === "") continue;

    if (DIRECTORY_DIRECTIVE.test(word)) {
      type = "directory";
      hasFilters = true;
      continue;
    }
    if (FILE_DIRECTIVE.test(word)) {
      type = "file";
      hasFilters = true;
      continue;
    }

    const ext = EXT_FILTER.exec(word);
    if (ext) {
      // Accept comma-separated extensions as well as repeated filters.
      for (const one of ext[1].split(",")) {
        const cleaned = one.replace(/^\./, "").toLowerCase();
        if (cleaned !== "") extensions.push(cleaned);
      }
      hasFilters = true;
      continue;
    }

    const afterMatch = AFTER_FILTER.exec(word);
    if (afterMatch) {
      const t = parseDate(afterMatch[1]);
      if (t !== undefined) {
        after = t;
        hasFilters = true;
        continue;
      }
    }

    const beforeMatch = BEFORE_FILTER.exec(word);
    if (beforeMatch) {
      const t = parseDate(beforeMatch[1]);
      if (t !== undefined) {
        before = t;
        hasFilters = true;
        continue;
      }
    }

    const size = SIZE_FILTER.exec(word);
    if (size) {
      const unit = (size[3] ?? "b").toLowerCase();
      const bytes = Number(size[2]) * (SIZE_UNITS[unit] ?? 1);
      if (size[1] === ">") minSize = bytes;
      else maxSize = bytes;
      hasFilters = true;
      continue;
    }

    // Skip partial directives instead of treating them as search terms.
    const partial = PARTIAL_DIRECTIVE.exec(word);
    if (
      partial &&
      DIRECTIVE_WORDS.some((w) => w.startsWith(partial[1].toLowerCase()))
    ) {
      continue;
    }
    // A bare attribute name remains a search term until the colon is typed.
    if (PARTIAL_ATTRIBUTE.test(word)) continue;

    // A leading dot includes hidden entries; a bare dot is only a filter.
    if (word.startsWith(".")) {
      hidden = true;
      hasFilters = true;
      if (word === ".") continue;
    }

    tokens.push(word);
  }

  // Use the longest term for Spotlight; later terms win ties.
  const longest = tokens.reduce((a, b) => (b.length >= a.length ? b : a), "");

  return {
    tokens,
    type,
    extensions,
    after,
    before,
    minSize,
    maxSize,
    longest,
    normalized: tokens.join(" ").toLowerCase(),
    hasFilters,
    hidden,
  };
}

/** Match tiers in ascending order of preference. */
export const MATCH = {
  /** You have opened this item with this exact query before. */
  LEARNED: -10,
  PREFIX: 0,
  WORD_PREFIX: 10,
  SUBSTRING: 20,
  SUBSEQUENCE: 30,
  /** Every token found, but only the enclosing path matched, not the name. */
  PATH: 40,
  /** Last resort: the query, spaces removed, is a subsequence of the path. */
  PATH_FUZZY: 50,
} as const;

/** Penalty when terms are out of path order or do not end on the item name. */
export const ORDER_PENALTY = 5;

const WORD_BREAK = /[\s._\-/+()[\]]/;

/** Grade a single token against a single name. Undefined if it does not match. */
export function matchTier(query: string, name: string): number | undefined {
  if (query === "") return MATCH.PREFIX;

  const q = query.toLowerCase();
  const n = name.toLowerCase();

  if (n.startsWith(q)) return MATCH.PREFIX;

  // Prefix of any word inside the name: "rep" hits "2026 Q3 report.pdf".
  for (let i = 1; i < n.length; i++) {
    if (WORD_BREAK.test(n[i - 1]) && n.startsWith(q, i))
      return MATCH.WORD_PREFIX;
  }

  if (n.includes(q)) return MATCH.SUBSTRING;

  // Subsequence, so "wdgq3" still finds "Widget Q3 Lecture Notes".
  return isSubsequence(q, n) ? MATCH.SUBSEQUENCE : undefined;
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/** Scores positional subsequence quality within a match tier, from 0 to 1. */
export function matchQuality(query: string, name: string): number {
  const q = query.toLowerCase();
  const n = name.toLowerCase();
  if (q === "" || n === "") return 0;

  let best = 0;
  let score = 0;
  let qi = 0;
  let run = 0;
  let runFirstBonus = 0;

  for (let i = 0; i < n.length; i++) {
    if (qi < q.length && n[i] === q[qi]) {
      let bonus = 1;
      if (i === 0) {
        bonus = 4; // start of the name
      } else if (WORD_BREAK.test(n[i - 1])) {
        bonus = 3; // start of a word
      } else if (
        name[i - 1] === name[i - 1].toLowerCase() &&
        name[i] !== name[i].toLowerCase()
      ) {
        bonus = 2; // camelCase hump
      }

      run += 1;
      if (run === 1) {
        runFirstBonus = bonus;
      } else {
        // Extend the opening bonus across a consecutive run.
        bonus = Math.max(bonus, runFirstBonus);
      }
      score += bonus + Math.min(run, 4);
      qi += 1;
    } else {
      run = 0;
    }
    if (qi === q.length) {
      // Keep scanning: a later, better-positioned occurrence can still win.
      best = Math.max(best, score);
      score = 0;
      qi = 0;
      run = 0;
    }
  }

  // Eight points per character is the maximum consecutive-run score.
  return Math.min(1, best / (q.length * 8));
}

/** Shortest query length that is allowed to reach the fuzzy whole-path tier. */
const MIN_PATH_FUZZY = 4;

/** Maximum path-wide subsequence span as a multiple of query length. */
const MAX_FUZZY_SPAN = 3;

/**
 * Length of the tightest window in `haystack` that contains `needle` as a
 * subsequence, or undefined if there is none.
 */
function tightestSubsequenceSpan(
  needle: string,
  haystack: string,
): number | undefined {
  let best: number | undefined;
  for (let start = 0; start < haystack.length; start++) {
    if (haystack[start] !== needle[0]) continue;
    let i = 1;
    let j = start + 1;
    while (j < haystack.length && i < needle.length) {
      if (haystack[j] === needle[i]) i++;
      j++;
    }
    // A later start has less room and cannot succeed if this one fails.
    if (i < needle.length) break;
    const span = j - start;
    if (best === undefined || span < best) best = span;
    if (best === needle.length) break; // A contiguous match cannot improve.
  }
  return best;
}

/** Matches a parsed query against the item name and enclosing path. */
export function matchPath(
  parsed: ParsedQuery,
  fullPath: string,
  /** Omit before stat(): the type filter is then skipped and applied later. */
  isDirectory?: boolean,
): number | undefined {
  if (isDirectory !== undefined) {
    if (parsed.type === "directory" && !isDirectory) return undefined;
    if (parsed.type === "file" && isDirectory) return undefined;
  }

  if (parsed.extensions.length > 0) {
    // Suffix matching supports compound extensions such as .tar.gz.
    const name = path.basename(fullPath).toLowerCase();
    if (!parsed.extensions.some((e) => name.endsWith(`.${e}`)))
      return undefined;
  }

  if (hiddenOnly(parsed)) {
    return path.basename(fullPath).startsWith(".") ? MATCH.PREFIX : undefined;
  }

  if (parsed.tokens.length === 0) return MATCH.PREFIX;

  const name = path.basename(fullPath);
  const lowerPath = fullPath.toLowerCase();

  // Every term must appear in the name or an enclosing folder.
  let bestOnName: number | undefined;
  let allPresent = true;
  for (const token of parsed.tokens) {
    const onName = matchTier(token, name);
    if (onName !== undefined) {
      bestOnName =
        bestOnName === undefined ? onName : Math.min(bestOnName, onName);
      continue;
    }
    if (!lowerPath.includes(token.toLowerCase())) {
      allPresent = false;
      break;
    }
  }

  if (!allPresent) {
    // Fall back to a tightly bounded subsequence across the full path.
    const squashed = parsed.tokens.join("").toLowerCase();
    if (squashed.length < MIN_PATH_FUZZY) return undefined;
    const span = tightestSubsequenceSpan(squashed, lowerPath);
    return span !== undefined && span <= squashed.length * MAX_FUZZY_SPAN
      ? MATCH.PATH_FUZZY
      : undefined;
  }

  // Check term order across the full path; slashes remain significant.
  let cursor = 0;
  let ordered = true;
  for (const token of parsed.tokens) {
    const at = lowerPath.indexOf(token.toLowerCase(), cursor);
    if (at === -1) {
      ordered = false;
      break;
    }
    cursor = at + token.length;
  }

  // Prefer queries whose last term names the item itself.
  const lastToken = parsed.tokens[parsed.tokens.length - 1];
  const lastComponent = lastToken.split("/").filter(Boolean).pop() ?? lastToken;
  const lastOnName = matchTier(lastComponent, name);

  // Grade both ordered and penalized matches from the same best name tier.
  if (ordered && lastOnName !== undefined) return bestOnName ?? lastOnName;
  if (bestOnName !== undefined) return bestOnName + ORDER_PENALTY;
  return MATCH.PATH;
}

/** Returns leading hidden path components that require direct scanning. */
export function dottedTerms(parsed: ParsedQuery): string[] {
  const out: string[] = [];
  for (const token of parsed.tokens) {
    if (!token.startsWith(".")) continue;
    const head = token.split("/")[0];
    if (head.length > 1 && !out.includes(head)) out.push(head);
  }
  return out;
}

/** True when matching folders may be scan roots but cannot be results. */
export function excludesDirectories(parsed: ParsedQuery): boolean {
  return (
    parsed.extensions.length > 0 ||
    parsed.type === "file" ||
    parsed.minSize !== undefined ||
    parsed.maxSize !== undefined
  );
}

/**
 * The filters that need a stat(): modification date and size. Kept out of
 * matchPath so the cheap string pass can run over thousands of paths first.
 */
export function matchesStats(
  parsed: ParsedQuery,
  stats: { mtimeMs: number; size: number; isDirectory: boolean },
): boolean {
  if (parsed.after !== undefined && stats.mtimeMs < parsed.after) return false;
  if (parsed.before !== undefined && stats.mtimeMs >= parsed.before)
    return false;
  // A size bound is meaningless for a folder, so it excludes folders outright.
  if (parsed.minSize !== undefined) {
    if (stats.isDirectory || stats.size <= parsed.minSize) return false;
  }
  if (parsed.maxSize !== undefined) {
    if (stats.isDirectory || stats.size >= parsed.maxSize) return false;
  }
  return true;
}
