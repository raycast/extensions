/** Separates a context key's context from its English text (gettext's EOT mark). */
export const CTX = '\u0004';

/**
 * Marks interface text for translation where it is defined, without
 * translating it there (docs/seo/i18n-plan.md): option labels, presets and
 * step labels in src/lib, which stays free of React and of '@/' imports so
 * server-side bundles can include it. scripts/i18n-extract.ts
 * collects every msg('...') source, and the component that shows the text
 * passes it through t(). Returns its argument unchanged.
 */
export const msg = Object.assign(<T extends string>(source: T): T => source, {
  /**
   * One English word or phrase with several meanings gets one catalog entry
   * per meaning (gettext's msgctxt): `t(msg.ctx('ordinal', 'Second'))` is
   * keyed "ordinal\u0004Second", so German can say "Zweite" there and
   * "Sekunde" for the plain 'Second'. English pages show the text alone.
   * Give the context to the less common meaning; the common one keeps the
   * plain key. In src/lib, where text can reach English output without t()
   * (MCP, step labels), put the key in a *Msg field (labelMsg via sayLabel)
   * and the plain text in the English field, never the key itself.
   */
  ctx: (context: string, text: string): string => `${context}${CTX}${text}`,
  /**
   * A count message in its English singular and plural: returns `one` when
   * `n === 1` and `other` otherwise (exactly the old `n === 1 ? a : b`), so
   * English never changes, and records the pair as a plural group, so t()
   * picks the form by the page language's CLDR plural rule
   * (Intl.PluralRules): French and Portuguese say « 0 jour », « 1,5 jour »;
   * Russian needs one/few/many/other.
   *
   *   t(msg.plural(n, { one: '1 day', other: '{n} days' }), { n })
   *   { text: msg.plural(months, { one: '{months} month', other: '{months} months' }), vars: { months } }
   *
   * The count must reach t() as a number in its vars, under `count` (the
   * placeholder name); by default the placeholder the singular leaves out
   * ('1 day' / '{n} days' -> n), else n, count or the only placeholder
   * (pluralCount). Both forms stay catalog keys; a catalog may give the
   * plural key every CLDR form instead ({ "one": ..., "few": ..., "many": ...,
   * "other": ... }, src/i18n/core.ts).
   */
  plural: (n: number, forms: PluralForms, count?: string): string => {
    registerPlural(forms, count);
    return n === 1 ? forms.one : forms.other;
  },
});

/** The English singular (used for exactly 1) and plural of a count message (msg.plural). */
export type PluralForms = { one: string; other: string };
/** A plural group: its English forms and the name of the placeholder that holds the count. */
export type PluralGroup = PluralForms & { count?: string };

const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

/**
 * The placeholder that holds the count of a plural group: the one the
 * singular leaves out ('1 day' / '{n} days' -> 'n'), else 'n' or 'count'
 * when present, else the only placeholder; undefined when none can be told.
 */
export function pluralCount(forms: PluralForms): string | undefined {
  const other = [...new Set(placeholders(forms.other))];
  const one = new Set(placeholders(forms.one));
  const missing = other.filter((p) => !one.has(p));
  if (missing.length === 1) return missing[0];
  if (other.includes('n')) return 'n';
  if (other.includes('count')) return 'count';
  return other.length === 1 ? other[0] : undefined;
}

/** True when the singular is written for any count (it has every placeholder of the plural), false for '1 day'-style text that only fits exactly 1. */
export const oneTakesCount = (forms: PluralForms): boolean => {
  const one = new Set(placeholders(forms.one));
  return placeholders(forms.other).every((p) => one.has(p));
};

/** Plural groups seen so far, by either English form (filled by msg.plural as code runs; translate() reads it). */
const PLURALS = new Map<string, PluralGroup>();
function registerPlural(forms: PluralForms, count?: string): void {
  if (PLURALS.get(forms.other)?.one === forms.one) return;
  const group: PluralGroup = { one: forms.one, other: forms.other, count: count ?? pluralCount(forms) };
  PLURALS.set(forms.other, group);
  if (!PLURALS.has(forms.one)) PLURALS.set(forms.one, group);
}

/** The plural group an English key belongs to, if msg.plural has seen it. */
export const pluralGroupOf = (key: string): PluralGroup | undefined => PLURALS.get(key);

/** A catalog key's English text: the key itself, or the text after its context (msg.ctx). */
export const plainText = (key: string): string => {
  const at = key.indexOf(CTX);
  return at < 0 ? key : key.slice(at + 1);
};

/**
 * Text built with values in src/lib (errors, notes): a msg()-marked English
 * template and the values for its {placeholders}, the same shape as a step's
 * StepMsg. The page shows it with t(m.text, m.vars); fillMsg gives the English.
 */
export type MsgText = { text: string; vars: Record<string, string | number> };

/** Fills a MsgText's {placeholders} exactly as t() does on English pages. */
export const fillMsg = (m: MsgText): string => plainText(m.text).replace(/\{(\w+)\}/g, (all, k: string) => (m.vars[k] === undefined ? all : String(m.vars[k])));

/** English text -> its template and values, for text that a lib's API keeps as a plain string (see built). */
const BUILT = new Map<string, MsgText>();

/**
 * Fills a msg()-marked template for text a lib returns as a plain English
 * string (an errors array, a Result's error) and remembers the template, so
 * the page can show t(builtMsg(s).text, builtMsg(s).vars). The same English
 * always comes from the same template and values.
 */
export function built(text: string, vars: MsgText['vars']): string {
  const english = fillMsg({ text, vars });
  if (BUILT.size > 5000) BUILT.clear();
  BUILT.set(english, { text, vars });
  return english;
}

/** The template and values behind a string made by built(), if any. */
export const builtMsg = (english: string): MsgText | undefined => BUILT.get(english);

/**
 * A lib string through a page's t(): by its template when built() made it,
 * otherwise as a msg()-marked key. English pages get the string unchanged.
 * `wordValues` also passes string values through t(), for values that are
 * msg()-marked words (a weekday, a row label); leave it off for user data,
 * file names and identifiers.
 */
export function translateBuilt(t: (source: string, vars?: MsgText['vars']) => string, english: string, wordValues = false): string {
  const m = BUILT.get(english);
  if (!m) return t(english);
  if (!wordValues) return t(m.text, m.vars);
  return t(m.text, Object.fromEntries(Object.entries(m.vars).map(([k, v]) => [k, typeof v === 'string' && /[A-Za-z]{2}/.test(v) ? t(v) : v])));
}
