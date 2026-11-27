/**
 * International Morse code (ITU-R M.1677-1) encoder, decoder, timing and WAV
 * synthesis for the Morse Code Translator and the morse_code MCP tool.
 */

/** ITU-R M.1677-1 characters. */
import { msg } from '../../msg';

export const ITU_MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  'É': '..-..',
  '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
  '.': '.-.-.-', ',': '--..--', ':': '---...', '?': '..--..', "'": '.----.', '-': '-....-', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
  '"': '.-..-.', '=': '-...-', '+': '.-.-.', '×': '-..-', '@': '.--.-.',
};

/** Widely used characters that are not in the ITU recommendation. */
export const EXTRA_MORSE: Record<string, string> = {
  '!': '-.-.--', '&': '.-...', ';': '-.-.-.', '$': '...-..-', _: '..--.-',
  'Ä': '.-.-', 'À': '.--.-', 'Å': '.--.-', 'Ç': '-.-..', 'È': '.-..-', 'Ñ': '--.--', 'Ö': '---.', 'Ü': '..--',
};

/** Procedural signals, sent as one run-together character. */
export const PROSIGNS: Record<string, string> = {
  SOS: '...---...', AR: '.-.-.', SK: '...-.-', BT: '-...-', KN: '-.--.', AS: '.-...', HH: '........', SN: '...-.', KA: '-.-.-', CT: '-.-.-',
};

/** Meaning of each prosign, for the reference table. */
export const PROSIGN_MEANING: Record<string, string> = {
  SOS: msg('Distress (not a word, sent without gaps)'),
  AR: msg('End of message (same as +)'),
  SK: msg('End of work / end of contact'),
  BT: msg('Break, new section (same as =)'),
  KN: msg('Go ahead, named station only (same as ()'),
  AS: msg('Wait (same as &)'),
  HH: msg('Error (eight dots)'),
  SN: msg('Understood'),
  KA: msg('Starting signal'),
};

const DECODE: Record<string, string> = (() => {
  const d: Record<string, string> = {};
  for (const [k, v] of Object.entries(EXTRA_MORSE)) if (!d[v]) d[v] = k;
  for (const [k, v] of Object.entries(ITU_MORSE)) if (k !== '×') d[v] = k; // ITU wins on shared codes
  d['----'] = 'CH';
  d['...---...'] = '<SOS>';
  d['...-.-'] = '<SK>';
  d['........'] = '<HH>';
  d['...-.'] = '<SN>';
  d['-.-.-'] = '<KA>';
  return d;
})();

export function charToMorse(ch: string): string | undefined {
  const up = ch.toLocaleUpperCase('en');
  return ITU_MORSE[up] ?? EXTRA_MORSE[up] ?? (up.normalize('NFD').replace(/[̀-ͯ]/g, '') !== up ? ITU_MORSE[up.normalize('NFD').replace(/[̀-ͯ]/g, '')] : undefined);
}

export type EncodeResult = {
  /** Letters separated by one space, words by " / ". */
  morse: string;
  /** Characters with no Morse code, skipped in the output. */
  unsupported: string[];
  /** Words as arrays of letter codes, used for timing and playback. */
  words: string[][];
};

/** Text to Morse. Wrap a prosign in angle brackets to send it run together: <SOS>, <AR>, <SK>. */
export function encodeMorse(text: string): EncodeResult {
  const unsupported = new Set<string>();
  const words: string[][] = [];
  for (const rawWord of text.trim().split(/\s+/)) {
    if (!rawWord) continue;
    const letters: string[] = [];
    const re = /<([A-Za-z]{2,4})>|[\s\S]/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(rawWord))) {
      if (m[1]) {
        const p = m[1].toUpperCase();
        const code = PROSIGNS[p] ?? Array.from(p).map((c) => charToMorse(c) ?? '').join('');
        if (code) letters.push(code);
        continue;
      }
      const code = charToMorse(m[0]);
      if (code) letters.push(code);
      else unsupported.add(m[0]);
    }
    if (letters.length) words.push(letters);
  }
  return { morse: words.map((w) => w.join(' ')).join(' / '), unsupported: [...unsupported], words };
}

/** Normalise dots and dashes typed with other symbols. */
export function normalizeMorseInput(input: string): string {
  return input
    .replace(/[·•∙⋅*]/g, '.')
    .replace(/[_−–—‒]/g, '-')
    .replace(/\r\n?/g, '\n');
}

/** True when the input looks like Morse rather than text. */
export function looksLikeMorse(input: string): boolean {
  const t = normalizeMorseInput(input).trim();
  return t.length > 0 && /^[.\-/|\s]+$/.test(t) && /[.-]/.test(t);
}

export type DecodeResult = { text: string; unknown: string[] };

/**
 * Morse to text. Letters are separated by a space; words by "/", "|", a line
 * break or two or more spaces. Unknown codes become "#" and are listed.
 */
export function decodeMorse(input: string): DecodeResult {
  const unknown = new Set<string>();
  const words = normalizeMorseInput(input)
    .trim()
    .split(/\s*[/|]\s*|\n+|\s{2,}/)
    .filter((w) => w.trim() !== '');
  const text = words
    .map((w) =>
      w
        .trim()
        .split(/\s+/)
        .map((code) => {
          if (!code) return '';
          const ch = DECODE[code];
          if (ch) return ch;
          unknown.add(code);
          return '#';
        })
        .join(''),
    )
    .join(' ');
  return { text, unknown: [...unknown] };
}

// ---------------------------------------------------------------------------
// Timing (PARIS standard and Farnsworth)
// ---------------------------------------------------------------------------

/** One tone or silence. `letter` is the index of the letter (across all words) it belongs to, or -1 for gaps between letters. */
export type MorseElement = { on: boolean; ms: number; letter: number };

export type TimingOptions = {
  /** Character speed in words per minute (PARIS standard, 50 units per word). */
  wpm: number;
  /** Overall (effective) speed for Farnsworth spacing; omit or set equal to wpm for standard timing. */
  effectiveWpm?: number;
};

export type Timing = { unitMs: number; dotMs: number; dashMs: number; symbolGapMs: number; letterGapMs: number; wordGapMs: number };

/**
 * One unit lasts 1200 / wpm milliseconds: a dot is 1 unit, a dash 3, the gap
 * inside a character 1, between characters 3 and between words 7. With
 * Farnsworth spacing the characters keep their speed and the gaps stretch,
 * using ta = (60c - 37.2s) / (s c) seconds split 3/19 per character gap and
 * 7/19 per word gap (Bloom, QEX 1990, as adopted by the ARRL).
 */
export function morseTiming({ wpm, effectiveWpm }: TimingOptions): Timing {
  const c = Math.max(1, wpm);
  const unit = 1200 / c;
  const s = effectiveWpm && effectiveWpm > 0 && effectiveWpm < c ? effectiveWpm : c;
  let letterGap = 3 * unit;
  let wordGap = 7 * unit;
  if (s < c) {
    const ta = ((60 * c - 37.2 * s) / (s * c)) * 1000;
    letterGap = (3 * ta) / 19;
    wordGap = (7 * ta) / 19;
  }
  return { unitMs: unit, dotMs: unit, dashMs: 3 * unit, symbolGapMs: unit, letterGapMs: letterGap, wordGapMs: wordGap };
}

/** On/off schedule for a list of words of letter codes. Ends with a word gap so repeated words keep their rhythm. */
export function morseSchedule(words: string[][], t: Timing, trailingWordGap = false): MorseElement[] {
  const out: MorseElement[] = [];
  let idx = 0;
  words.forEach((letters, wi) => {
    letters.forEach((code, li) => {
      const syms = Array.from(code);
      syms.forEach((sym, si) => {
        out.push({ on: true, ms: sym === '-' ? t.dashMs : t.dotMs, letter: idx });
        if (si < syms.length - 1) out.push({ on: false, ms: t.symbolGapMs, letter: idx });
      });
      idx++;
      if (li < letters.length - 1) out.push({ on: false, ms: t.letterGapMs, letter: -1 });
    });
    if (wi < words.length - 1 || trailingWordGap) out.push({ on: false, ms: t.wordGapMs, letter: -1 });
  });
  return out;
}

export function scheduleDurationMs(schedule: MorseElement[]): number {
  return schedule.reduce((s, e) => s + e.ms, 0);
}

/** Number of timing units in a code string such as "PARIS" (letters and gaps, no trailing gap). */
export function unitsForWord(letters: string[]): number {
  let u = 0;
  letters.forEach((code, i) => {
    for (const s of code) u += s === '-' ? 3 : 1;
    u += code.length - 1;
    if (i < letters.length - 1) u += 3;
  });
  return u;
}

// ---------------------------------------------------------------------------
// WAV synthesis
// ---------------------------------------------------------------------------

export type WavOptions = { frequency?: number; sampleRate?: number; volume?: number; rampMs?: number };

/**
 * 16-bit mono PCM WAV of a schedule. Each tone gets a raised-cosine ramp at
 * both ends (5 ms by default) so it does not click.
 */
export function morseWav(schedule: MorseElement[], opts: WavOptions = {}): Uint8Array {
  const rate = opts.sampleRate ?? 22050;
  const f = opts.frequency ?? 600;
  const vol = Math.min(1, Math.max(0, opts.volume ?? 0.6));
  const rampS = Math.max(0, (opts.rampMs ?? 5) / 1000);
  const total = schedule.reduce((s, e) => s + Math.round((e.ms / 1000) * rate), 0);
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + total * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, total * 2, true);
  let p = 44;
  for (const e of schedule) {
    const n = Math.round((e.ms / 1000) * rate);
    const ramp = Math.min(Math.floor(rampS * rate), Math.floor(n / 2));
    for (let i = 0; i < n; i++) {
      let sample = 0;
      if (e.on) {
        let env = 1;
        if (ramp > 0 && i < ramp) env = 0.5 - 0.5 * Math.cos((Math.PI * i) / ramp);
        else if (ramp > 0 && i >= n - ramp) env = 0.5 - 0.5 * Math.cos((Math.PI * (n - 1 - i)) / ramp);
        sample = Math.sin((2 * Math.PI * f * i) / rate) * vol * env;
      }
      v.setInt16(p, Math.round(sample * 32767), true);
      p += 2;
    }
  }
  return new Uint8Array(buf);
}
