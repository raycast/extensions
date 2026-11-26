/**
 * Text statistics and readability for the writing tools (word counter,
 * readability checker) and their MCP tools. Pure functions, no React.
 *
 * Word rule: a word is a whitespace-separated token that contains at least one
 * letter or digit, so "don't", "e-mail" and "3.5" are one word each and a lone
 * dash or emoji is not a word. Chinese and Japanese characters are counted one
 * word per character, as Microsoft Word does for East Asian text.
 */
import { msg } from '../../msg';

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

type Segmenter = { segment: (s: string) => Iterable<{ segment: string }> };

function graphemeSegmenter(): Segmenter | null {
  const I = Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => Segmenter };
  return typeof I.Segmenter === 'function' ? new I.Segmenter(undefined, { granularity: 'grapheme' }) : null;
}

/** Split into user-perceived characters (grapheme clusters). */
export function graphemes(text: string): string[] {
  const seg = graphemeSegmenter();
  if (!seg) return Array.from(text);
  const out: string[] = [];
  for (const s of seg.segment(text)) out.push(s.segment);
  return out;
}

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const CJK_G = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
const HAS_WORD_CHAR = /[\p{L}\p{N}]/u;

/** Count words in one whitespace-free token. */
function wordsInToken(token: string): number {
  if (!CJK.test(token)) return HAS_WORD_CHAR.test(token) ? 1 : 0;
  const cjk = (token.match(CJK_G) ?? []).length;
  const rest = token.split(CJK_G).filter((p) => HAS_WORD_CHAR.test(p)).length;
  return cjk + rest;
}

export function countWords(text: string): number {
  let n = 0;
  for (const t of text.split(/\s+/)) if (t) n += wordsInToken(t);
  return n;
}

/** Words with surrounding punctuation stripped, for frequency and readability. */
export function wordList(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\s+/)) {
    if (!raw || !HAS_WORD_CHAR.test(raw)) continue;
    const w = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (w) out.push(w);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------

/** Titles that are always followed by a name, never end a sentence. */
const TITLES = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'rev', 'gen', 'sen', 'rep', 'st', 'mt', 'capt', 'lt', 'col', 'sgt', 'gov', 'pres', 'hon', 'messrs', 'mme', 'mlle', 'jr', 'sr']);
/** Abbreviations that sit inside a sentence. */
const INNER = new Set(['e.g', 'i.e', 'vs', 'cf', 'approx', 'fig', 'figs', 'no', 'nos', 'vol', 'pp', 'p', 'ch', 'sec', 'eq', 'ref', 'al', 'ca', 'viz', 'a.m', 'p.m', 'u.s', 'u.k', 'u.s.a', 'e.u', 'ph.d', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec']);
/** Abbreviations that end a sentence only when a capital letter follows. */
const SOFT = new Set(['etc', 'inc', 'ltd', 'co', 'corp', 'dept', 'est', 'llc', 'plc', 'bros']);

export type SentenceOptions = {
  /** Treat every line break as the end of a sentence (headings, list items). Default true. */
  lineBreaksEndSentences?: boolean;
};

export type Sentence = { text: string; start: number; end: number };

function isBoundary(text: string, dotIndex: number, after: number): boolean {
  // Look at the word that ends in this full stop.
  let i = dotIndex - 1;
  while (i >= 0 && !/\s/.test(text[i])) i--;
  const word = text.slice(i + 1, dotIndex).replace(/^[("'“‘[]+/, '').toLowerCase();
  // What comes next (skip spaces).
  let j = after;
  while (j < text.length && /[ \t]/.test(text[j])) j++;
  const next = text[j] ?? '';
  if (next === '') return true;
  if (/\n/.test(next)) return true;
  if (/^\d+$/.test(word) && /\d/.test(text[dotIndex + 1] ?? '')) return false; // 3.5
  if (TITLES.has(word)) return false;
  if (INNER.has(word)) return false;
  if (/^\p{Lu}$/u.test(text.slice(i + 1, dotIndex).replace(/^[("'“‘[]+/, ''))) return false; // initials "J. K."
  if (/^(?:\p{L}\.)+\p{L}$/u.test(word)) return false; // U.S, e.g style
  if (SOFT.has(word)) return /\p{Lu}/u.test(next);
  // A lower-case continuation means the full stop was not a sentence end.
  if (/\p{Ll}/u.test(next)) return false;
  return true;
}

/** Split text into sentences with their character offsets. */
export function splitSentences(text: string, opts: SentenceOptions = {}): Sentence[] {
  const lineBreaks = opts.lineBreaksEndSentences ?? true;
  const out: Sentence[] = [];
  let start = 0;
  const push = (end: number) => {
    const slice = text.slice(start, end);
    if (HAS_WORD_CHAR.test(slice)) {
      const lead = slice.length - slice.trimStart().length;
      const trimmed = slice.trim();
      out.push({ text: trimmed, start: start + lead, end: start + lead + trimmed.length });
    }
    start = end;
  };
  const re = lineBreaks
    ? /[。！？]+[」』"'”’)\]]*|[.!?…]+["'”’)\]]*(?=\s|$)|\n/g
    : /[。！？]+[」』"'”’)\]]*|[.!?…]+["'”’)\]]*(?=\s|$)|\n[ \t]*\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const tok = m[0];
    const end = m.index + tok.length;
    if (tok.startsWith('\n')) {
      push(m.index);
      continue;
    }
    // Ideographic stops are always sentence ends; '!' '?' too.
    if (/^\.+["'”’)\]]*$/.test(tok) && tok.replace(/["'”’)\]]/g, '').length === 1) {
      if (!isBoundary(text, m.index, end)) continue;
    }
    push(end);
  }
  push(text.length);
  return out;
}

export function countParagraphs(text: string): number {
  return text.split(/\n[ \t]*\n+/).filter((p) => HAS_WORD_CHAR.test(p)).length;
}

// ---------------------------------------------------------------------------
// Syllables (English heuristic with an exception list)
// ---------------------------------------------------------------------------

/** Words the rules below get wrong, with their dictionary syllable counts. */
const SYLLABLE_EXCEPTIONS: Record<string, number> = {
  the: 1, every: 3, everything: 3, everyone: 3, everybody: 4, different: 3, business: 2, businesses: 3, family: 3, families: 3,
  people: 2, area: 3, areas: 3, idea: 3, ideas: 3, create: 2, created: 3, creates: 2, creating: 3, creation: 3, creative: 3,
  react: 2, reacts: 2, real: 1, really: 2, being: 2, seeing: 2, doing: 2, going: 2, quiet: 2, science: 2, scientist: 3,
  poem: 2, poet: 2, poetry: 3, lion: 2, ion: 2, iron: 2, hour: 1, hours: 1, our: 1, fire: 1, tired: 1, choir: 1,
  queue: 1, value: 2, continue: 3, continued: 3, video: 3, radio: 3, piano: 3, museum: 3, theatre: 3, theater: 3,
  naive: 2, cafe: 2, recipe: 3, simile: 3, apostrophe: 4, catastrophe: 4, epitome: 4, hyperbole: 4, acne: 2, coyote: 3,
  forever: 3, interesting: 3, interest: 2, chocolate: 2, camera: 3, several: 3, general: 3, average: 3, evening: 2,
  favorite: 3, favourite: 3, vegetable: 4, comfortable: 4, temperature: 4, probably: 3, actually: 4, usually: 4,
  ocean: 2, cruel: 2, fuel: 2, dual: 2, duel: 2, jewel: 2, diet: 2, client: 2, violent: 3,
  genuine: 3, unique: 2, technique: 2, antique: 2, colleague: 2, league: 1, tongue: 1, plague: 1,
  wednesday: 2, february: 4, january: 4, library: 3, "wouldn't": 2, "couldn't": 2, "shouldn't": 2, "didn't": 2, "isn't": 2,
  "wasn't": 2, "doesn't": 2, "hasn't": 2, "haven't": 2, "aren't": 1, "weren't": 1, maybe: 2, someone: 2, sometimes: 2, somewhere: 2,
  something: 2, anyone: 3, everywhere: 3, whatever: 3, however: 3, therefore: 2, furthermore: 3, more: 1, before: 2,
  ages: 2, changes: 2, pages: 2, places: 2, sentences: 3, uses: 2, causes: 2, houses: 2, process: 2, processes: 3,
  readability: 5, readable: 3, reader: 2, readers: 2, region: 2, regions: 2, medium: 3, media: 3, period: 3, serious: 3,
  experience: 4, audience: 3, previous: 3, various: 3, obvious: 3, material: 4, social: 2, special: 2, official: 3,
  initial: 3, potential: 3, essential: 3, financial: 3, million: 2, billion: 2, opinion: 3, onion: 2, union: 2,
  champion: 3, companion: 3, behaviour: 3, behavior: 3, saviour: 2, senior: 2, junior: 2,
};

const SUB_SYL = [/[^aeiou]e(?:ful|ness|less)/, /cial/, /tia/, /cius/, /cious/, /giu/, /ion/, /iou/, /sia$/, /.ely$/, /[^aeioutd]ed$/];
const ADD_SYL = [/ia/, /riet/, /dien/, /iu/, /io/, /ii/, /[aeiouym]bl$/, /(?!eau)[aeiou]{3}/, /^mc/, /[^aeiou]i(?:ers?|est)$/, /[aeiou]y[aeiou]/, /[^aeiou]ying$/, /^(?:geo|theo|neo)/, /[ei]ality$/, /[^gqb]ui[dn]/, /ism$/, /([^aeiouy])\1l$/, /[^l]lien/, /^coa[dglx]./, /[^gq]ua[^auieo]/, /dnt$/];

function syllablesOfPart(part: string): number {
  if (!part) return 0;
  if (SYLLABLE_EXCEPTIONS[part] !== undefined) return SYLLABLE_EXCEPTIONS[part];
  // Plural or verb forms of exceptions: "ideas" -> idea + 0, "areas" -> area.
  if (part.endsWith('s') && SYLLABLE_EXCEPTIONS[part.slice(0, -1)] !== undefined) return SYLLABLE_EXCEPTIONS[part.slice(0, -1)];
  if (part.length <= 3) return 1;
  let w = part;
  let syl = 0;
  // "-le" after a consonant is its own syllable (table, little); keep its e.
  const le = /[^aeiouy]le$/.test(w);
  if (!le) w = w.replace(/e$/, '');
  for (const r of SUB_SYL) if (r.test(w)) syl--;
  for (const r of ADD_SYL) if (r.test(w)) syl++;
  const groups = w.split(/[^aeiouy]+/).filter(Boolean).length;
  syl += groups;
  // "-es" after s, x, z, ch, sh, ge, ce adds a syllable (boxes, pages); otherwise silent (makes).
  if (/[^aeiouy]es$/.test(part) && !/(?:[sxz]|ch|sh|[cg]|[^aeiouy]l)es$/.test(part)) syl--;
  return Math.max(1, syl);
}

/** Estimated syllables in an English word. Numbers count one syllable per digit. */
export function countSyllables(word: string): number {
  const raw = word.toLowerCase().replace(/[’']/g, "'");
  if (/^[\d.,]+$/.test(raw)) return Math.max(1, raw.replace(/\D/g, '').length);
  if (SYLLABLE_EXCEPTIONS[raw] !== undefined) return SYLLABLE_EXCEPTIONS[raw];
  const clean = raw.replace(/'s$/, '').replace(/[^a-z-]/g, '');
  if (!clean) return raw ? 1 : 0;
  // Hyphenated compounds: add the parts.
  return clean
    .split('-')
    .filter(Boolean)
    .reduce((s, p) => s + syllablesOfPart(p), 0) || 1;
}

// ---------------------------------------------------------------------------
// Text statistics (word counter)
// ---------------------------------------------------------------------------

export const STOP_WORDS = new Set(
  'a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves'.split(' '),
);

export type TextStats = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  letters: number;
  utf8Bytes: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  uniqueWords: number;
  avgWordLength: number;
  avgSentenceLength: number;
  longestWord: string;
  syllables: number;
  readingSeconds: number;
  speakingSeconds: number;
  pagesSingle: number;
  pagesDouble: number;
};

export type StatsOptions = SentenceOptions & {
  /** Silent reading speed in words per minute. Default 238 (Brysbaert 2019, non-fiction). */
  readingWpm?: number;
  /** Speaking speed in words per minute. Default 150. */
  speakingWpm?: number;
};

export const DEFAULT_READING_WPM = 238;
export const DEFAULT_SPEAKING_WPM = 150;
/** Rule-of-thumb words per page: 12 pt Times New Roman, 1 inch margins. */
export const WORDS_PER_PAGE_SINGLE = 500;
export const WORDS_PER_PAGE_DOUBLE = 250;

export function textStats(text: string, opts: StatsOptions = {}): TextStats {
  const g = graphemes(text);
  const words = countWords(text);
  const list = wordList(text);
  const lettersOnly = list.map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''));
  const letters = lettersOnly.reduce((s, w) => s + graphemes(w).length, 0);
  const unique = new Set(list.map((w) => w.toLowerCase())).size;
  const sentences = splitSentences(text, opts).length;
  let longest = '';
  for (const w of lettersOnly) if (graphemes(w).length > graphemes(longest).length) longest = w;
  const rw = opts.readingWpm && opts.readingWpm > 0 ? opts.readingWpm : DEFAULT_READING_WPM;
  const sw = opts.speakingWpm && opts.speakingWpm > 0 ? opts.speakingWpm : DEFAULT_SPEAKING_WPM;
  const trimmed = text.replace(/\n+$/, '');
  return {
    words,
    characters: g.length,
    charactersNoSpaces: g.filter((c) => !/^\s+$/.test(c)).length,
    letters,
    utf8Bytes: utf8Bytes(text),
    sentences,
    paragraphs: countParagraphs(text),
    lines: trimmed === '' ? 0 : trimmed.split(/\r\n|\r|\n/).length,
    uniqueWords: unique,
    avgWordLength: list.length ? letters / list.length : 0,
    avgSentenceLength: sentences ? words / sentences : 0,
    longestWord: longest,
    syllables: list.reduce((s, w) => s + countSyllables(w), 0),
    readingSeconds: (words / rw) * 60,
    speakingSeconds: (words / sw) * 60,
    pagesSingle: words / WORDS_PER_PAGE_SINGLE,
    pagesDouble: words / WORDS_PER_PAGE_DOUBLE,
  };
}

export type WordFrequency = { word: string; count: number; percent: number };

/** Most frequent words, case-insensitive, optionally without English stop words. */
export function topWords(text: string, limit = 10, skipStopWords = true): WordFrequency[] {
  const list = wordList(text).map((w) => w.toLowerCase());
  const total = list.length;
  const counts = new Map<string, number>();
  for (const w of list) {
    if (skipStopWords && STOP_WORDS.has(w.replace(/[’']/g, "'"))) continue;
    if (/^\d+$/.test(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map((e) => ({ word: e[0], count: e[1], percent: total ? (e[1] / total) * 100 : 0 }));
}

/** "3 min 20 s", "45 s", "1 h 05 min". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 s';
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return sec ? `${m} min ${sec} s` : `${m} min`;
}

// ---------------------------------------------------------------------------
// Platform limits
// ---------------------------------------------------------------------------

/** twitter-text v3 weighting: these code point ranges weigh 1, everything else 2. */
const X_LIGHT_RANGES: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+/giu;
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

/**
 * Weighted length of an X (Twitter) post, following twitter-text v3: text is
 * NFC-normalised, code points U+0000-U+10FF and a few punctuation ranges weigh
 * 1, other characters (CJK, most symbols) weigh 2, each emoji sequence weighs
 * 2 and each link weighs 23. Links are recognised when they start with
 * http://, https:// or www.
 */
export function xPostLength(text: string): number {
  const norm = text.normalize('NFC');
  let weight = 0;
  let rest = norm;
  const urls = norm.match(URL_RE) ?? [];
  weight += urls.length * 23;
  rest = norm.replace(URL_RE, '');
  for (const g of graphemes(rest)) {
    if (EMOJI_RE.test(g)) {
      weight += 2;
      continue;
    }
    for (const ch of g) {
      const cp = ch.codePointAt(0)!;
      weight += X_LIGHT_RANGES.some((r) => cp >= r[0] && cp <= r[1]) ? 1 : 2;
    }
  }
  return weight;
}

const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€\f';

export type SmsInfo = { encoding: 'GSM-7' | 'UCS-2'; units: number; segments: number; perSegment: number; remaining: number };

/**
 * SMS segment count per 3GPP TS 23.038: GSM 7-bit messages hold 160 septets
 * (153 per part when split), extension characters such as € and { take two;
 * anything outside the GSM alphabet switches the whole message to UCS-2 with
 * 70 UTF-16 units (67 per part). Escape pairs and surrogate pairs are not split.
 */
export function smsInfo(text: string): SmsInfo {
  const chars = Array.from(text);
  const gsm = chars.every((c) => GSM_BASIC.includes(c) || GSM_EXT.includes(c));
  const cost = (c: string) => (gsm ? (GSM_EXT.includes(c) ? 2 : 1) : c.length);
  const units = chars.reduce((s, c) => s + cost(c), 0);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  if (units === 0) return { encoding: gsm ? 'GSM-7' : 'UCS-2', units: 0, segments: 0, perSegment: single, remaining: single };
  if (units <= single) return { encoding: gsm ? 'GSM-7' : 'UCS-2', units, segments: 1, perSegment: single, remaining: single - units };
  let segments = 1;
  let fill = 0;
  for (const c of chars) {
    const k = cost(c);
    if (fill + k > multi) {
      segments++;
      fill = 0;
    }
    fill += k;
  }
  return { encoding: gsm ? 'GSM-7' : 'UCS-2', units, segments, perSegment: multi, remaining: multi - fill };
}

export type PlatformLimit = {
  id: string;
  label: string;
  limit: number;
  /** How the count is measured. */
  basis: 'weighted' | 'characters' | 'graphemes' | 'sms';
  note: string;
};

export const PLATFORM_LIMITS: PlatformLimit[] = [
  { id: 'x', label: msg('X (Twitter) post'), limit: 280, basis: 'weighted', note: msg('Weighted: links 23, emoji and CJK 2') },
  { id: 'threads', label: msg('Threads post'), limit: 500, basis: 'characters', note: '' },
  { id: 'bluesky', label: msg('Bluesky post'), limit: 300, basis: 'graphemes', note: msg('Counted in graphemes') },
  { id: 'mastodon', label: msg('Mastodon post'), limit: 500, basis: 'characters', note: msg('Default; servers can change it') },
  { id: 'linkedin', label: msg('LinkedIn post'), limit: 3000, basis: 'characters', note: '' },
  { id: 'instagram', label: msg('Instagram caption'), limit: 2200, basis: 'characters', note: '' },
  { id: 'facebook', label: msg('Facebook post'), limit: 63206, basis: 'characters', note: '' },
  { id: 'youtube-title', label: msg('YouTube title'), limit: 100, basis: 'characters', note: '' },
  { id: 'youtube-desc', label: msg('YouTube description'), limit: 5000, basis: 'characters', note: '' },
  { id: 'title-tag', label: msg('Search result title'), limit: 60, basis: 'characters', note: msg('Guideline; Google truncates by pixel width') },
  { id: 'meta', label: msg('Meta description'), limit: 160, basis: 'characters', note: msg('Guideline; snippets are cut near 920 px') },
  { id: 'sms', label: msg('SMS (one segment)'), limit: 160, basis: 'sms', note: msg('160 GSM-7 or 70 Unicode characters') },
];

export type PlatformResult = PlatformLimit & { used: number; remaining: number; over: boolean; detail?: string; detailMsg?: { text: string; vars: Record<string, string | number> } };

export function platformCounts(text: string): PlatformResult[] {
  const g = graphemes(text).length;
  const cu = Array.from(text).length;
  const sms = smsInfo(text);
  return PLATFORM_LIMITS.map((p) => {
    if (p.basis === 'sms') {
      const limit = sms.encoding === 'GSM-7' ? 160 : 70;
      return { ...p, limit, used: sms.units, remaining: limit - sms.units, over: sms.units > limit, detail: `${sms.encoding}, ${sms.segments} segment${sms.segments === 1 ? '' : 's'}`, detailMsg: { text: msg.plural(sms.segments, { one: '{encoding}, {segments} segment', other: '{encoding}, {segments} segments' }, 'segments'), vars: { encoding: sms.encoding, segments: sms.segments } } };
    }
    const used = p.basis === 'weighted' ? xPostLength(text) : p.basis === 'graphemes' ? g : cu;
    return { ...p, used, remaining: p.limit - used, over: used > p.limit };
  });
}

// ---------------------------------------------------------------------------
// Readability
// ---------------------------------------------------------------------------

export type ReadabilityScores = {
  sentences: number;
  words: number;
  syllables: number;
  letters: number;
  polysyllables: number;
  complexWords: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  smog: number;
  colemanLiau: number;
  automatedReadabilityIndex: number;
  /** Mean of FK, Fog, SMOG, Coleman-Liau and ARI grade levels. */
  averageGrade: number;
  /** True when SMOG had fewer than 30 sentences to work with. */
  smogShortSample: boolean;
};

/** Flesch (1948) Reading Ease. */
export const fleschReadingEase = (words: number, sentences: number, syllables: number) =>
  206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
/** Kincaid et al. (1975) grade level. */
export const fleschKincaidGrade = (words: number, sentences: number, syllables: number) =>
  0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
/** Gunning (1952) Fog index. */
export const gunningFog = (words: number, sentences: number, complexWords: number) =>
  0.4 * (words / sentences + 100 * (complexWords / words));
/** McLaughlin (1969) SMOG grade, regression form. */
export const smogGrade = (polysyllables: number, sentences: number) => 1.043 * Math.sqrt(polysyllables * (30 / sentences)) + 3.1291;
/** Coleman and Liau (1975): L = letters per 100 words, S = sentences per 100 words. */
export const colemanLiau = (letters: number, words: number, sentences: number) =>
  0.0588 * ((letters / words) * 100) - 0.296 * ((sentences / words) * 100) - 15.8;
/** Smith and Senter (1967) Automated Readability Index. */
export const automatedReadabilityIndex = (letters: number, words: number, sentences: number) =>
  4.71 * (letters / words) + 0.5 * (words / sentences) - 21.43;

/**
 * Gunning's "hard word": three or more syllables, not a proper noun (a
 * capitalised word that does not start a sentence), not a hyphenated compound,
 * and still three syllables after dropping -es, -ed or -ing.
 */
export function isComplexWord(word: string, sentenceStart: boolean): boolean {
  if (word.includes('-')) return false;
  if (!sentenceStart && /^\p{Lu}/u.test(word)) return false;
  if (countSyllables(word) < 3) return false;
  const stem = word.toLowerCase().replace(/(?:es|ed|ing)$/, '');
  if (stem !== word.toLowerCase() && countSyllables(stem) < 3) return false;
  return true;
}

export function readability(text: string, opts: SentenceOptions = {}): ReadabilityScores | null {
  const sentences = splitSentences(text, opts);
  let words = 0;
  let syllables = 0;
  let letters = 0;
  let poly = 0;
  let complex = 0;
  for (const s of sentences) {
    const list = wordList(s.text);
    list.forEach((w, i) => {
      const syl = countSyllables(w);
      words++;
      syllables += syl;
      letters += w.replace(/[^\p{L}\p{N}]/gu, '').length;
      if (syl >= 3) poly++;
      if (isComplexWord(w, i === 0)) complex++;
    });
  }
  const n = sentences.length;
  if (words === 0 || n === 0) return null;
  const fk = fleschKincaidGrade(words, n, syllables);
  const fog = gunningFog(words, n, complex);
  const smog = smogGrade(poly, n);
  const cl = colemanLiau(letters, words, n);
  const ari = automatedReadabilityIndex(letters, words, n);
  return {
    sentences: n,
    words,
    syllables,
    letters,
    polysyllables: poly,
    complexWords: complex,
    wordsPerSentence: words / n,
    syllablesPerWord: syllables / words,
    fleschReadingEase: fleschReadingEase(words, n, syllables),
    fleschKincaidGrade: fk,
    gunningFog: fog,
    smog,
    colemanLiau: cl,
    automatedReadabilityIndex: ari,
    averageGrade: (fk + fog + smog + cl + ari) / 5,
    smogShortSample: n < 30,
  };
}

/** Flesch's 1949 table for Reading Ease bands. */
export function fleschBand(score: number): { label: string; school: string } {
  if (score >= 90) return { label: msg('Very easy'), school: msg('5th grade') };
  if (score >= 80) return { label: msg('Easy'), school: msg('6th grade') };
  if (score >= 70) return { label: msg('Fairly easy'), school: msg('7th grade') };
  if (score >= 60) return { label: msg('Standard'), school: msg('8th and 9th grade') };
  if (score >= 50) return { label: msg('Fairly difficult'), school: msg('10th to 12th grade') };
  if (score >= 30) return { label: msg('Difficult'), school: msg('College') };
  return { label: msg('Very difficult'), school: msg('College graduate') };
}

/** US grade level to a reader description. */
export function gradeLabel(grade: number): string {
  const m = gradeLabelMsg(grade);
  return m.text.replace('{grade}', String(m.vars.grade));
}

/** gradeLabel as interface text with a {grade} placeholder, for pages to translate. */
export function gradeLabelMsg(grade: number): { text: string; vars: Record<string, number> } {
  if (grade < 1) return { text: msg('Kindergarten'), vars: {} };
  if (grade <= 12) return { text: msg('Grade {grade}'), vars: { grade: Math.round(grade) } };
  if (grade <= 16) return { text: msg('College'), vars: {} };
  return { text: msg('Postgraduate'), vars: {} };
}

// ---- Sentence-level analysis ----------------------------------------------

/** Irregular past participles used to spot "was written", "is known" and so on. */
const IRREGULAR_PARTICIPLES = new Set(
  'arisen awoken been borne born beaten become begun bent bet bid bitten bled blown broken bred brought built burnt burst bought cast caught chosen clung come cost crept cut dealt dug done drawn dreamt driven drunk eaten fallen fed felt fought found fled flung flown forbidden forgotten forgiven frozen gotten given gone ground grown hung heard hidden hit held hurt kept knelt known laid led leant left lent let lain lit lost made meant met paid proven put quit read ridden rung risen run said seen sought sold sent set sewn shaken shed shone shot shown shrunk shut sung sunk sat slept slid slung spoken sped spent spilt spun spread sprung stood stolen stuck stung stunk struck sworn swept swollen swum swung taken taught torn told thought thrown thrust trodden understood undertaken upset woken worn woven wed wept won wound withdrawn written'.split(' '),
);
const BE = /^(?:am|is|are|was|were|be|been|being|is't|isn't|aren't|wasn't|weren't|'s|'re|get|gets|got|gotten|getting)$/i;
/** -ed words that are almost always adjectives after "be". */
const ED_ADJECTIVES = new Set(['tired', 'interested', 'excited', 'bored', 'scared', 'worried', 'pleased', 'married', 'supposed', 'used', 'ashamed', 'concerned', 'involved', 'related', 'based', 'advanced', 'detailed', 'experienced', 'limited', 'qualified', 'talented', 'complicated', 'sophisticated', 'naked', 'wicked', 'sacred', 'beloved', 'aged', 'learned', 'crowded', 'confused', 'amazed', 'surprised', 'satisfied', 'determined', 'prepared', 'needed', 'red', 'bed', 'shed', 'fed', 'wed', 'led', 'need', 'speed', 'seed', 'feed', 'indeed', 'hundred']);

/** Wordy words and phrases with plainer alternatives (US Federal Plain Language Guidelines). */
export const PLAIN_WORDS: [string, string][] = [
  ['utilize', 'use'], ['utilise', 'use'], ['utilization', 'use'], ['in order to', 'to'], ['commence', 'start'], ['approximately', 'about'],
  ['assist', 'help'], ['assistance', 'help'], ['purchase', 'buy'], ['sufficient', 'enough'], ['prior to', 'before'], ['subsequent to', 'after'],
  ['in the event that', 'if'], ['due to the fact that', 'because'], ['owing to the fact that', 'because'], ['at this point in time', 'now'],
  ['with regard to', 'about'], ['with respect to', 'about'], ['in regard to', 'about'], ['a number of', 'some'], ['facilitate', 'help'],
  ['endeavor', 'try'], ['endeavour', 'try'], ['demonstrate', 'show'], ['terminate', 'end'], ['numerous', 'many'], ['additional', 'more'],
  ['individuals', 'people'], ['initiate', 'start'], ['obtain', 'get'], ['in addition to', 'and, also'], ['in accordance with', 'under, by'],
  ['for the purpose of', 'to, for'], ['in the near future', 'soon'], ['until such time as', 'until'], ['notwithstanding', 'despite'],
  ['ascertain', 'find out'], ['accomplish', 'do'], ['remainder', 'rest'], ['transmit', 'send'], ['indicate', 'show'], ['modify', 'change'],
  ['methodology', 'method'], ['is able to', 'can'], ['has the ability to', 'can'], ['at the present time', 'now'], ['on a daily basis', 'daily'],
];

const ADVERB_EXCEPTIONS = new Set(['only', 'early', 'family', 'reply', 'apply', 'supply', 'daily', 'weekly', 'monthly', 'yearly', 'likely', 'unlikely', 'friendly', 'lovely', 'lonely', 'ugly', 'holy', 'italy', 'july', 'fly', 'rely', 'ally', 'belly', 'bully', 'jelly', 'hilly', 'silly', 'chilly', 'curly', 'elderly', 'costly', 'orderly', 'timely', 'kindly', 'assembly', 'anomaly', 'butterfly', 'comply', 'imply', 'multiply', 'ply', 'sly', 'jolly', 'lily', 'emily', 'billy', 'molly', 'sally', 'polly', 'holly', 'reilly', 'kelly', 'wholly', 'oily', 'woolly', 'surly', 'burly', 'homely', 'manly', 'deadly', 'lively', 'stately', 'scholarly', 'ghostly', 'heavenly', 'cowardly', 'quarterly', 'hourly', 'nightly', 'bodily']);

export type SentenceIssue = { kind: 'passive' | 'adverb' | 'plain'; text: string; start: number; end: number; suggestion?: string };

export type SentenceReport = Sentence & {
  words: number;
  grade: number;
  level: 'ok' | 'hard' | 'very-hard';
  issues: SentenceIssue[];
};

/** Passive constructions: a form of "be" or "get", up to one -ly adverb, then a past participle. */
export function findPassive(sentence: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  const tokens = [...sentence.matchAll(/[\p{L}’']+/gu)].map((m) => ({ w: m[0], i: m.index! }));
  for (let k = 0; k < tokens.length - 1; k++) {
    if (!BE.test(tokens[k].w.replace(/’/g, "'"))) continue;
    let j = k + 1;
    if (/ly$/i.test(tokens[j].w) && j + 1 < tokens.length) j++;
    if (/^not$/i.test(tokens[j].w) && j + 1 < tokens.length) j++;
    const w = tokens[j].w.toLowerCase();
    const participle = (w.length > 3 && /ed$/.test(w) && !ED_ADJECTIVES.has(w)) || IRREGULAR_PARTICIPLES.has(w);
    if (participle) {
      const start = tokens[k].i;
      const end = tokens[j].i + tokens[j].w.length;
      out.push({ text: sentence.slice(start, end), start, end });
      k = j;
    }
  }
  return out;
}

export function findAdverbs(sentence: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  for (const m of sentence.matchAll(/\b[\p{L}]+ly\b/giu)) {
    const w = m[0].toLowerCase();
    if (w.length < 5 || ADVERB_EXCEPTIONS.has(w)) continue;
    out.push({ text: m[0], start: m.index!, end: m.index! + m[0].length });
  }
  return out;
}

export function findPlainWords(sentence: string): { text: string; start: number; end: number; suggestion: string }[] {
  const out: { text: string; start: number; end: number; suggestion: string }[] = [];
  for (const [phrase, plain] of PLAIN_WORDS) {
    // Single words also match their inflections (utilized, assists, purchasing).
    const body = phrase.includes(' ') ? phrase.replace(/ /g, '\\s+') : `${phrase.replace(/e$/, '')}(?:e|es|ed|ing|s|d)?`;
    const re = new RegExp(`\\b${body}\\b`, 'gi');
    for (const m of sentence.matchAll(re)) out.push({ text: m[0], start: m.index!, end: m.index! + m[0].length, suggestion: plain });
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Per-sentence report. A sentence of 14 or more words is "hard" when its own
 * Flesch-Kincaid grade is 10 or more and "very hard" at 14 or more.
 */
export function analyzeSentences(text: string, opts: SentenceOptions = {}): SentenceReport[] {
  return splitSentences(text, opts).map((s) => {
    const list = wordList(s.text);
    const syl = list.reduce((a, w) => a + countSyllables(w), 0);
    const grade = list.length ? fleschKincaidGrade(list.length, 1, syl) : 0;
    const level: SentenceReport['level'] = list.length >= 14 && grade >= 14 ? 'very-hard' : list.length >= 14 && grade >= 10 ? 'hard' : 'ok';
    const issues: SentenceIssue[] = [
      ...findPassive(s.text).map((x) => ({ kind: 'passive' as const, ...x })),
      ...findAdverbs(s.text).map((x) => ({ kind: 'adverb' as const, ...x })),
      ...findPlainWords(s.text).map((x) => ({ kind: 'plain' as const, ...x })),
    ].sort((a, b) => a.start - b.start);
    return { ...s, words: list.length, grade, level, issues };
  });
}
