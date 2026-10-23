// The server's rules for a commit body, so the extension can refuse what /dev/null would refuse
// before anything is signed or sent. They mirror, and must stay in sync with:
// - app/Models/Commit.php (MIN_BODY_LENGTH, MAX_BODY_LENGTH)
// - app/Rules/CommitBodyLength.php (MAX_RAW_LENGTH, the link-length and character-count checks)
// - app/Services/CommitBodies.php (normalize) and app/Services/CodeSpans.php (what counts as code)
// - app/Services/Urls.php (what counts as a link, and how much of it is counted)
// in https://github.com/nunomaduro/dev-null.sh, whose web composer applies the same rules.

export const MIN_BODY_LENGTH = 1;
export const MAX_BODY_LENGTH = 4000;
export const MAX_RAW_BODY_LENGTH = 40000;
export const MAX_URL_LENGTH = 2048;
/** A prose link counts as at most this many characters, however long it is. */
export const COUNTED_LINK_LENGTH = 23;

// A fenced block (a line opening with ``` and a line that is only ```) or inline `code` on one line.
const CODE = new RegExp(
  String.raw`((?<![^\n])\`{3,}[^\`\r\n]*\r?\n(?:[\s\S]*?\r?\n)?\`{3,}[ \t]*(?![^\r\n])|\`[^\`\r\n]+\`)`,
);

// Bare domains only count as links on these top-level domains; most file extensions are also TLDs.
const TOP_LEVEL_DOMAINS = (
  "com org net edu gov mil info biz io dev app co ai me xyz tech gg tv fm ly to is blog cloud site online design " +
  "studio tools software codes wiki news website club ninja rocks academy guide social digital agency fyi lol live " +
  "uk de fr nl es it pt br ca au jp ch se no dk fi be at ie nz us eu cz sk hu ro bg gr hr si ee lv lt ru ua tr il za " +
  "mx ar kr cn tw hk sg vn th"
).split(" ");

const LINK = new RegExp(
  String.raw`(?<![\p{L}\p{N}\p{M}\p{Pc}])[Hh][Tt][Tt][Pp][Ss]?:\/\/[^\s<>]+` +
    String.raw`|(?<![\p{L}\p{N}_.\/@-])(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+` +
    `(?:${[...TOP_LEVEL_DOMAINS, ...TOP_LEVEL_DOMAINS.map((tld) => tld.toUpperCase())].join("|")})` +
    String.raw`(?![\p{L}\p{N}_(-]|\.[A-Za-z0-9])(?:[\/?#][^\s<>]*)?`,
  "gu",
);

/** Code points, which is how the server's `mb_strlen` counts. */
export function codePoints(text: string): number {
  return Array.from(text).length;
}

/** Splits into alternating prose (even indexes) and code (odd indexes). */
function splitCode(text: string): string[] {
  return text.split(CODE);
}

/** The body as the server saves it: trimmed, line endings unified, and 3+ blank lines in prose collapsed to one. */
export function normalizeBody(body: string): string {
  return splitCode(body.trim().replace(/\r\n?/g, "\n"))
    .map((part, index) => (index % 2 === 0 ? part.replace(/(?:[ \t]*\n){3,}/g, "\n\n") : part))
    .join("");
}

function trimTrailingPunctuation(candidate: string): string {
  let link = candidate;
  let previous: string;
  do {
    previous = link;
    link = link.replace(/[.,;:!?'"…”’]+$/u, "");
    for (const [open, close] of [
      ["(", ")"],
      ["[", "]"],
    ]) {
      if (link.endsWith(close) && link.split(open).length < link.split(close).length) link = link.slice(0, -1);
    }
  } while (link !== previous);
  return link;
}

function hrefLength(link: string): number {
  return codePoints(/^https?:\/\//i.test(link) ? link : `https://${link}`);
}

/** Every link in the prose of an already-normalized body, without trailing punctuation. */
function proseLinks(normalized: string): string[] {
  return splitCode(normalized)
    .filter((_, index) => index % 2 === 0)
    .flatMap((prose) => Array.from(prose.matchAll(LINK), (match) => trimTrailingPunctuation(match[0])))
    .filter((link) => !link.endsWith("://"));
}

/** The length /dev/null holds against the 4,000 limit: code points, with each prose link counted as at most 23. */
export function bodyCharacterCount(body: string): number {
  const normalized = normalizeBody(body);
  let length = codePoints(normalized);
  for (const link of proseLinks(normalized)) {
    if (hrefLength(link) <= MAX_URL_LENGTH) length -= Math.max(0, codePoints(link) - COUNTED_LINK_LENGTH);
  }
  return length;
}

/** Why /dev/null would refuse this body, in its own words where it has them, or undefined if it would accept it. */
export function bodyError(body: string): string | undefined {
  // A lone UTF-16 surrogate can't be encoded as UTF-8, and the server refuses a payload that isn't.
  if (/\p{Cs}/u.test(body)) return "The commit contains a character that can't be sent.";
  const normalized = normalizeBody(body);
  if (codePoints(normalized) < MIN_BODY_LENGTH) return "Write something to commit.";
  if (codePoints(normalized) > MAX_RAW_BODY_LENGTH) {
    return `A commit can't be longer than ${MAX_RAW_BODY_LENGTH.toLocaleString()} characters, links included.`;
  }
  if (proseLinks(normalized).some((link) => hrefLength(link) > MAX_URL_LENGTH)) {
    return `Each link must not be greater than ${MAX_URL_LENGTH.toLocaleString()} characters.`;
  }
  const length = bodyCharacterCount(body);
  if (length > MAX_BODY_LENGTH) {
    return `${length.toLocaleString()} of ${MAX_BODY_LENGTH.toLocaleString()} characters. Shorten it to commit.`;
  }
  return undefined;
}
