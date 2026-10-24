// Wikitext structure: section slicing, a brace-matching template scanner, and a
// renderer back down to plain prose.
//
// A regex cannot do the scanning. Etymologies nest templates inside template
// arguments ({{quote-text|en|author=Sir {{w|John Ross}}}}) and inside wikilinks
// ({{m|la|salarium [[argentum]]||salt money}}), so `|` and `}}` both have to be
// counted rather than matched.

export interface Template {
  name: string;
  /** Positional arguments, 0-indexed after the name. May contain empty strings. */
  args: string[];
  named: Record<string, string>;
  start: number;
  end: number;
}

export interface Section {
  label: string;
  body: string;
}

/** Slice out one `==Language==` block, up to the next level-2 heading. */
export function languageSection(wikitext: string, language: string): string | undefined {
  const heading = new RegExp(`^==\\s*${escapeRegExp(language)}\\s*==[ \\t]*$`, "m");
  const start = heading.exec(wikitext);
  if (!start) return undefined;

  const from = start.index + start[0].length;
  const next = /^==[^=\n][^\n]*==[ \t]*$/m.exec(wikitext.slice(from));
  return next ? wikitext.slice(from, from + next.index) : wikitext.slice(from);
}

/**
 * The `===Etymology===` (or `===Etymology 1===`, `2`, ...) blocks of a language
 * section. Terminated by any following heading: the next one is usually
 * `====Noun====`, whose four equals signs a level-3-only pattern would miss,
 * dragging the entire translation table into the etymology.
 */
export function etymologySections(languageSection: string): Section[] {
  const out: Section[] = [];
  const heading = /^===\s*(Etymology(?:\s+\d+)?)\s*===[ \t]*$/gm;

  for (let m = heading.exec(languageSection); m; m = heading.exec(languageSection)) {
    const from = m.index + m[0].length;
    const next = /^=+[^\n]*?=+[ \t]*$/m.exec(languageSection.slice(from));
    out.push({
      label: m[1],
      body: (next ? languageSection.slice(from, from + next.index) : languageSection.slice(from)).trim(),
    });
  }
  return out;
}

export interface PosSection {
  pos: string;
  senses: string[];
}

// Wiktionary's part-of-speech headings. Listed rather than matched loosely so
// that "Pronunciation", "Synonyms" and "Translations" are not read as senses.
const POS = [
  "Noun",
  "Proper noun",
  "Verb",
  "Adjective",
  "Adverb",
  "Pronoun",
  "Preposition",
  "Conjunction",
  "Interjection",
  "Determiner",
  "Numeral",
  "Article",
  "Particle",
  "Prefix",
  "Suffix",
  "Infix",
  "Circumfix",
  "Letter",
  "Symbol",
  "Phrase",
  "Proverb",
  "Contraction",
  "Abbreviation",
  "Initialism",
  "Acronym",
].join("|");

/**
 * Definitions, from the same wikitext the etymology came out of.
 *
 * A sense is a line opening with a single `#`. The exclusions matter: `#:` is a
 * usage example, `#*` a quotation, and `##` a subsense, and pulling those in
 * turns one definition into a page of citations.
 */
export function partsOfSpeech(section: string): PosSection[] {
  const heading = new RegExp(`^(={3,5})\\s*(${POS})\\s*\\1[ \\t]*$`, "gm");
  const out: PosSection[] = [];

  for (let m = heading.exec(section); m; m = heading.exec(section)) {
    const from = m.index + m[0].length;
    const rest = section.slice(from);
    const next = /^=+[^\n]*?=+[ \t]*$/m.exec(rest);
    const body = next ? rest.slice(0, next.index) : rest;

    const senses = body
      .split("\n")
      .filter((line) => /^#[^#*:]/.test(line))
      .map((line) => line.slice(1).trim());

    if (senses.length) out.push({ pos: m[2], senses });
  }
  return out;
}

/**
 * The full extent of each etymology, subsections included.
 *
 * `etymologySections` stops at the next heading of any level, which is right for
 * the etymology prose but cuts off the `====Noun====` that belongs to it. A page
 * with several etymologies nests its parts of speech under each one, so pairing
 * senses with the right origin needs the wider slice: heading to next level-3.
 */
export function etymologyScopes(languageSection: string): string[] {
  const heading = /^===\s*Etymology(?:\s+\d+)?\s*===[ \t]*$/gm;
  const scopes: string[] = [];

  for (let m = heading.exec(languageSection); m; m = heading.exec(languageSection)) {
    const rest = languageSection.slice(m.index + m[0].length);
    const next = /^===(?!=)[^\n]*===[ \t]*$/m.exec(rest);
    scopes.push(next ? rest.slice(0, next.index) : rest);
  }
  return scopes;
}

/** Top-level templates in document order. Nested ones stay inside their parent. */
export function parseTemplates(text: string): Template[] {
  const out: Template[] = [];

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{" || text[i + 1] !== "{") continue;

    const end = matchingClose(text, i);
    if (end < 0) continue;

    const parsed = parseOne(text.slice(i + 2, end), i, end + 2);
    if (parsed) out.push(parsed);
    i = end + 1;
  }
  return out;
}

/** Index of the `}}` closing the `{{` at `open`, or -1 if unbalanced. */
function matchingClose(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{") {
      depth++;
      i++;
    } else if (text[i] === "}" && text[i + 1] === "}") {
      depth--;
      if (depth === 0) return i;
      i++;
    }
  }
  return -1;
}

function parseOne(inner: string, start: number, end: number): Template | undefined {
  const parts = splitArgs(inner);
  const name = parts.shift()?.trim();
  if (!name) return undefined;

  const args: string[] = [];
  const named: Record<string, string> = {};

  for (const part of parts) {
    const eq = part.indexOf("=");
    // An `=` only names an argument when what precedes it looks like a key.
    // Otherwise it is content, as in a URL or a gloss containing an equals sign.
    if (eq > 0 && /^[A-Za-z0-9_\- ]+$/.test(part.slice(0, eq).trim())) {
      named[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    } else {
      args.push(part.trim());
    }
  }
  return { name, args, named, start, end };
}

/** Split on `|` that is not inside a nested template or a wikilink. */
function splitArgs(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let last = 0;

  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "{" && inner[i + 1] === "{") {
      depth++;
      i++;
    } else if (inner[i] === "}" && inner[i + 1] === "}") {
      depth--;
      i++;
    } else if (inner[i] === "[" && inner[i + 1] === "[") {
      depth++;
      i++;
    } else if (inner[i] === "]" && inner[i + 1] === "]") {
      depth--;
      i++;
    } else if (inner[i] === "|" && depth === 0) {
      parts.push(inner.slice(last, i));
      last = i + 1;
    }
  }
  parts.push(inner.slice(last));
  return parts;
}

// Templates that render as nothing useful in running prose: citations, reference
// shorthands, categorisation, and the tree markers handled elsewhere.
//
// Split into exact names and prefixes deliberately. As one alternation the
// category template `c` silently swallowed every template whose name merely began
// with a c - cognates, compounds, calques - and left the commas between them
// behind, so a cognate list rendered as "Cognate with ,,,,,,,,."
const DROPPED_EXACT = new Set([
  "c",
  "cln",
  "topics",
  "catlangname",
  "catlangcode",
  "wp",
  "wikipedia",
  "etymon",
  "ety",
  "senseid",
  "sid",
  "anchor",
  "multitrans",
  "attn",
  "attention",
  "sup",
  "nobr",
]);

const DROPPED_PREFIX = /^(ref$|r:|rfe|rfv|cite-|quote-|trans-|col(-|\d|$))/i;

const PARENTHETICAL = new Set([
  "lb",
  "label",
  "q",
  "qualifier",
  "qual",
  "gl",
  "glossary",
  "sense",
  "n",
  "non-gloss definition",
  "ng",
]);

/** Wording a `+`-suffixed derivation template prints ahead of the link. */
const INTRO: Record<string, string> = {
  inh: "inherited from",
  bor: "borrowed from",
  der: "derived from",
  uder: "derived from",
  lbor: "learned borrowing from",
  slbor: "semi-learned borrowing from",
  obor: "orthographic borrowing from",
  ubor: "unadapted borrowing from",
  cal: "calque of",
  calq: "calque of",
  calque: "calque of",
  clq: "calque of",
  psm: "phono-semantic matching of",
  sl: "semantic loan from",
};

/**
 * Wikitext to readable prose. Language codes are resolved through `langName` so
 * that `{{inh|en|enm|water}}` reads "Middle English water" rather than leaking a
 * code the reader has no way to expand.
 */
export function toPlainText(wikitext: string, langName: (code: string) => string): string {
  const rendered = renderTemplates(removeCollapsedBlocks(wikitext), langName);
  return stripMarkup(rendered)
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*\n\s*/g, "\n\n")
    .trim();
}

/**
 * Cognate boxes, which Wiktionary renders collapsed. `water` lists forty of them,
 * and inlined they bury the six lines of ancestry the reader came for. Dropping
 * the region rather than the templates inside it is what keeps the introducing
 * sentence ("Cognate with ...") from being left behind with nothing after it.
 */
function removeCollapsedBlocks(wikitext: string): string {
  return wikitext.replace(/\{\{\s*(col|rel|der)-top\b[\s\S]*?\{\{\s*\1-bottom\s*\}\}/gi, "");
}

function renderTemplates(text: string, langName: (code: string) => string): string {
  let out = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "{" && text[i + 1] === "{") {
      const end = matchingClose(text, i);
      if (end < 0) {
        out += text[i++];
        continue;
      }
      const t = parseOne(text.slice(i + 2, end), i, end + 2);
      out += t ? renderTemplate(t, langName) : "";
      i = end + 2;
      continue;
    }
    out += text[i++];
  }
  return out;
}

function renderTemplate(t: Template, langName: (code: string) => string): string {
  const name = t.name.trim().toLowerCase();
  if (DROPPED_EXACT.has(name) || DROPPED_PREFIX.test(name)) return "";

  const inner = (s: string | undefined) => (s ? renderTemplates(s, langName) : "");

  if (PARENTHETICAL.has(name)) {
    const body = t.args.slice(name === "lb" || name === "label" ? 1 : 0).filter(Boolean);
    return body.length ? `(${body.map(inner).join(", ")})` : "";
  }

  // `{{w|Don Quixote}}` / `{{w|John Ross (explorer)|John Ross}}` - Wikipedia link.
  if (name === "w") return inner(t.args[1] || t.args[0]);

  // `{{U|various}}` capitalises a definition's first word. Dropped as an unknown
  // template it takes the word with it, leaving senses that open mid-sentence:
  // "in kind, quality, or manifestation; diverse."
  if (name === "u" || name === "ucfirst") return capitalize(inner(t.args[0] ?? ""));

  // `{{chemf|H2O}}` sets a chemical formula. Dropped, water's first definition
  // reads "An inorganic compound (of molecular formula )".
  if (name === "chemf" || name === "chem") return inner(t.args[0] ?? "").replace(/[{}]/g, "");

  // Derivation templates lead with the entry's own language, then the source
  // language: {{inh|en|enm|water}}. Cognate templates have no entry language at
  // all, {{cog|sco|watter}}, so reading them the same way takes the term as the
  // language and renders nothing, leaving "Cognate with ,,,,,,,."
  const plus = name.endsWith("+");
  const base = plus ? name.slice(0, -1) : name;
  const derivational = /^(inh|bor|der|lbor|slbor|ubor|obor|uder|cal|calq|calque|clq|psm|sl)$/.test(base);
  const comparative = /^(cog|ncog|noncog|cognate)$/.test(base);

  if (derivational || comparative) {
    const offset = derivational ? 1 : 0;
    const lang = t.args[offset];
    const term = t.args[offset + 1];
    const alt = t.args[offset + 2];
    const gloss = t.args[offset + 3];

    const shown = inner(t.named.alt || alt || term || "");
    const g = t.named.t ?? t.named.gloss ?? gloss;

    // The trailing "+" asks Wiktionary to print the words that introduce the
    // link. Without them a sentence opens mid-clause: "Middle English shirreve,
    // in turn Old English sċīrġerēfa" instead of "Inherited from Middle English
    // shirreve, in turn inherited from Old English sċīrġerēfa".
    const intro = plus ? INTRO[base] : undefined;
    const lead = intro && (t.named.nocap ? intro : capitalize(intro));

    return [
      lead,
      [langName(lang), shown].filter(Boolean).join(" "),
      t.named.tr && `(${t.named.tr})`,
      g && `(“${inner(g)}”)`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (name === "m" || name === "mention" || name === "l" || name === "link") {
    const [lang, term, alt, gloss] = t.args;
    const shown = inner(t.named.alt || alt || term || "");
    const g = t.named.t ?? t.named.gloss ?? gloss;
    const head = name === "m" || name === "mention" ? shown : shown || lang;
    return [head, g && `(“${inner(g)}”)`].filter(Boolean).join(" ");
  }

  if (name === "root") return "";

  // Morphological templates read naturally as "a + b". An empty first component
  // is the headword standing in for itself, as in {{suffix|en||-ic}}, which
  // Wiktionary renders as a leading "+ -ic".
  if (/^(af|affix|suffix|suf|prefix|pre|confix|com|compound|blend|surf|univerbation|univ)$/.test(name)) {
    const slots = t.args.slice(1);
    const parts = slots.map((arg, i) => inner(t.named[`alt${i + 1}`] || arg));
    const rendered = parts.filter(Boolean).join(" + ");
    return slots.length > 1 && !slots[0] ? `+ ${rendered}` : rendered;
  }

  if (name === "doublet") return `doublet of ${t.args.slice(1).map(inner).filter(Boolean).join(", ")}`;
  if (name === "coin") return t.args[1] ? `coined by ${inner(t.args[1])}` : "";

  return "";
}

/** Wikilinks, bold/italic, HTML comments and refs down to bare text. */
export function stripMarkup(text: string): string {
  return (
    text
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<ref[^>]*\/>/gi, "")
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
      .replace(/<\/?[a-z][^>]*>/gi, "")
      .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
      .replace(/\[\[([^\]]*)\]\]/g, "$1")
      .replace(/'''([^']*)'''/g, "$1")
      .replace(/''([^']*)''/g, "$1")
      // List markers, which require trailing space. Without that condition this
      // also eats the asterisk off every reconstructed form: *watar, *wódr̥.
      .replace(/^[*#:;]+[ \t]+/gm, "")
      .replace(/\s+([,.;:])/g, "$1")
      .replace(/\(\s*\)/g, "")
      .trim()
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
