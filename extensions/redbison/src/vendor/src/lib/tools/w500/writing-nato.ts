/**
 * ICAO / NATO radiotelephony spelling alphabet (ICAO Annex 10, Volume II,
 * Communication Procedures) for the NATO Phonetic Alphabet Converter and the
 * nato_phonetic MCP tool.
 */

export type NatoEntry = { letter: string; word: string; common: string; say: string };

/** Code words with the ICAO spellings (Alfa, Juliett) and their ICAO pronunciation respellings. */
export const NATO_LETTERS: NatoEntry[] = [
  { letter: 'A', word: 'Alfa', common: 'Alpha', say: 'AL FAH' },
  { letter: 'B', word: 'Bravo', common: 'Bravo', say: 'BRAH VOH' },
  { letter: 'C', word: 'Charlie', common: 'Charlie', say: 'CHAR LEE or SHAR LEE' },
  { letter: 'D', word: 'Delta', common: 'Delta', say: 'DELL TAH' },
  { letter: 'E', word: 'Echo', common: 'Echo', say: 'ECK OH' },
  { letter: 'F', word: 'Foxtrot', common: 'Foxtrot', say: 'FOKS TROT' },
  { letter: 'G', word: 'Golf', common: 'Golf', say: 'GOLF' },
  { letter: 'H', word: 'Hotel', common: 'Hotel', say: 'HOH TELL' },
  { letter: 'I', word: 'India', common: 'India', say: 'IN DEE AH' },
  { letter: 'J', word: 'Juliett', common: 'Juliet', say: 'JEW LEE ETT' },
  { letter: 'K', word: 'Kilo', common: 'Kilo', say: 'KEY LOH' },
  { letter: 'L', word: 'Lima', common: 'Lima', say: 'LEE MAH' },
  { letter: 'M', word: 'Mike', common: 'Mike', say: 'MIKE' },
  { letter: 'N', word: 'November', common: 'November', say: 'NO VEM BER' },
  { letter: 'O', word: 'Oscar', common: 'Oscar', say: 'OSS CAH' },
  { letter: 'P', word: 'Papa', common: 'Papa', say: 'PAH PAH' },
  { letter: 'Q', word: 'Quebec', common: 'Quebec', say: 'KEH BECK' },
  { letter: 'R', word: 'Romeo', common: 'Romeo', say: 'ROW ME OH' },
  { letter: 'S', word: 'Sierra', common: 'Sierra', say: 'SEE AIR RAH' },
  { letter: 'T', word: 'Tango', common: 'Tango', say: 'TANG GO' },
  { letter: 'U', word: 'Uniform', common: 'Uniform', say: 'YOU NEE FORM or OO NEE FORM' },
  { letter: 'V', word: 'Victor', common: 'Victor', say: 'VIK TAH' },
  { letter: 'W', word: 'Whiskey', common: 'Whiskey', say: 'WISS KEY' },
  { letter: 'X', word: 'X-ray', common: 'X-ray', say: 'ECKS RAY' },
  { letter: 'Y', word: 'Yankee', common: 'Yankee', say: 'YANG KEY' },
  { letter: 'Z', word: 'Zulu', common: 'Zulu', say: 'ZOO LOO' },
];

export type NatoDigit = { digit: string; word: string; icao: string; say: string };

/** ICAO number pronunciation (Tree, Fower, Fife, Niner) next to the plain English word. */
export const NATO_DIGITS: NatoDigit[] = [
  { digit: '0', word: 'Zero', icao: 'Zero', say: 'ZE RO' },
  { digit: '1', word: 'One', icao: 'One', say: 'WUN' },
  { digit: '2', word: 'Two', icao: 'Two', say: 'TOO' },
  { digit: '3', word: 'Three', icao: 'Tree', say: 'TREE' },
  { digit: '4', word: 'Four', icao: 'Fower', say: 'FOW ER' },
  { digit: '5', word: 'Five', icao: 'Fife', say: 'FIFE' },
  { digit: '6', word: 'Six', icao: 'Six', say: 'SIX' },
  { digit: '7', word: 'Seven', icao: 'Seven', say: 'SEV EN' },
  { digit: '8', word: 'Eight', icao: 'Eight', say: 'AIT' },
  { digit: '9', word: 'Nine', icao: 'Niner', say: 'NIN ER' },
];

/** Spoken names for common symbols (not part of the ICAO alphabet). */
export const SYMBOL_NAMES: Record<string, string> = {
  '.': 'Dot', ',': 'Comma', '-': 'Dash', _: 'Underscore', '/': 'Slash', '\\': 'Backslash', '@': 'At sign', '#': 'Hash', '&': 'Ampersand',
  '+': 'Plus', '=': 'Equals', '?': 'Question mark', '!': 'Exclamation mark', ':': 'Colon', ';': 'Semicolon', '(': 'Open bracket',
  ')': 'Close bracket', '[': 'Open square bracket', ']': 'Close square bracket', '{': 'Open brace', '}': 'Close brace', "'": 'Apostrophe',
  '"': 'Quote', '*': 'Asterisk', '%': 'Percent', $: 'Dollar', '€': 'Euro', '£': 'Pound sign', '^': 'Caret', '~': 'Tilde', '|': 'Pipe',
  '<': 'Less than', '>': 'Greater than', '`': 'Backtick',
};

export type SpellOptions = {
  /** 'icao' uses Alfa and Juliett as published; 'common' uses Alpha and Juliet. */
  spelling?: 'icao' | 'common';
  /** 'icao' says Tree, Fower, Fife, Niner; 'plain' says Three, Four, Five, Nine. */
  digits?: 'icao' | 'plain';
  /** Prefix letters with "Capital" or "Lowercase" (for passwords and codes). */
  markCase?: boolean;
};

export type SpelledToken = {
  char: string;
  /** What to say, e.g. "Alfa", "Capital Bravo", "Niner", "Dash". */
  word: string;
  /** ICAO pronunciation respelling when there is one. */
  say?: string;
  kind: 'letter' | 'digit' | 'symbol' | 'space' | 'other';
};

const LETTER = new Map(NATO_LETTERS.map((e) => [e.letter, e]));
const DIGIT = new Map(NATO_DIGITS.map((d) => [d.digit, d]));

/** Spell text character by character with the ICAO alphabet. Accented letters use their base letter. */
export function spellNato(text: string, opts: SpellOptions = {}): SpelledToken[] {
  const spelling = opts.spelling ?? 'icao';
  const digits = opts.digits ?? 'icao';
  const chars = Array.from(text);
  return chars.map((ch, i): SpelledToken => {
    if (/\s/.test(ch)) return { char: ch, word: '(space)', kind: 'space' };
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const up = base.toUpperCase();
    const e = base.length === 1 ? LETTER.get(up) : undefined;
    if (e) {
      const w = spelling === 'icao' ? e.word : e.common;
      const accent = base !== ch ? ' (accented)' : '';
      const prefix = opts.markCase ? (base === up ? 'Capital ' : 'Lowercase ') : '';
      return { char: ch, word: `${prefix}${w}${accent}`, say: e.say, kind: 'letter' };
    }
    const d = DIGIT.get(ch);
    if (d) return { char: ch, word: digits === 'icao' ? d.icao : d.word, say: d.say, kind: 'digit' };
    if (ch === '.' && /\d/.test(chars[i - 1] ?? '') && /\d/.test(chars[i + 1] ?? '')) {
      return { char: ch, word: 'Decimal', say: 'DAY SEE MAL', kind: 'symbol' };
    }
    if (SYMBOL_NAMES[ch]) return { char: ch, word: SYMBOL_NAMES[ch], kind: 'symbol' };
    return { char: ch, word: ch, kind: 'other' };
  });
}

/** One line per word of the input, code words separated by spaces. */
export function spellNatoText(text: string, opts: SpellOptions = {}): string {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) =>
          spellNato(w, opts)
            .map((t) => t.word)
            .join(' '),
        )
        .join(' / '),
    )
    .join('\n');
}

const REVERSE: Record<string, string> = (() => {
  const r: Record<string, string> = {};
  for (const e of NATO_LETTERS) {
    r[e.word.toLowerCase()] = e.letter;
    r[e.common.toLowerCase()] = e.letter;
  }
  r['xray'] = 'X';
  r['whisky'] = 'W';
  r['juliette'] = 'J';
  for (const d of NATO_DIGITS) {
    r[d.word.toLowerCase()] = d.digit;
    r[d.icao.toLowerCase()] = d.digit;
  }
  r['nadazero'] = '0';
  r['unaone'] = '1';
  r['bissotwo'] = '2';
  r['terrathree'] = '3';
  r['kartefour'] = '4';
  r['pantafive'] = '5';
  r['soxisix'] = '6';
  r['setteseven'] = '7';
  r['oktoeight'] = '8';
  r['novenine'] = '9';
  r['decimal'] = '.';
  r['stop'] = '.';
  for (const [sym, name] of Object.entries(SYMBOL_NAMES)) r[name.toLowerCase().replace(/\s+/g, '')] = sym;
  r['hyphen'] = '-';
  r['period'] = '.';
  r['space'] = ' ';
  return r;
})();

export type DecodeNatoResult = { text: string; unknown: string[] };

/**
 * Code words back to text: "Alfa Bravo / Charlie" gives "AB C". Words are
 * matched case-insensitively and both spellings are accepted (Alpha/Alfa,
 * Juliet/Juliett, Whisky/Whiskey). "Capital" and "Lowercase" prefixes set case.
 */
export function decodeNato(input: string): DecodeNatoResult {
  const unknown = new Set<string>();
  const groups = input.split(/\s*[/|]\s*|\n+/);
  const out = groups.map((g) => {
    const tokens = g.split(/[\s,;]+/).filter(Boolean);
    let s = '';
    let nextCase: 'upper' | 'lower' | null = null;
    for (let i = 0; i < tokens.length; i++) {
      const raw = tokens[i];
      const t = raw.toLowerCase().replace(/[^a-z-]/g, '').replace(/-/g, '');
      if (t === 'capital' || t === 'uppercase' || t === 'upper' || t === 'cap') {
        nextCase = 'upper';
        continue;
      }
      if (t === 'lowercase' || t === 'small' || t === 'lower') {
        nextCase = 'lower';
        continue;
      }
      // Two-word symbol names such as "question mark".
      const two = (t + (tokens[i + 1] ?? '').toLowerCase().replace(/[^a-z]/g, '')).trim();
      let ch = REVERSE[t];
      if (!ch && REVERSE[two]) {
        ch = REVERSE[two];
        i++;
      }
      if (!ch) {
        if (t) unknown.add(raw);
        continue;
      }
      if (/[A-Z]/.test(ch)) ch = nextCase === 'lower' ? ch.toLowerCase() : ch;
      nextCase = null;
      s += ch;
    }
    return s;
  });
  return { text: out.join(' ').trim(), unknown: [...unknown] };
}
