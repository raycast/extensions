import * as wanakana from "wanakana";

export const KANJI_SCRIPT = /[一-龯]/;
export const JAPANESE_SCRIPT = /[぀-ヿ一-龯]/;

export function normalizeRomaji(input: string): string {
  // `tch` -> `cch` so casual spellings like "matcha" get the sokuon, and a
  // word-final `nn` -> `n` so the IME habit of typing "nihonn" still yields
  // にほん (plain wanakana would read that second n as its own syllable).
  return input.replace(/tch/gi, "cch").replace(/nn$/i, "n");
}

export function toHiraganaFinal(input: string): string {
  return wanakana.toHiragana(normalizeRomaji(input));
}

export function toKatakanaFinal(input: string): string {
  return wanakana.toKatakana(normalizeRomaji(input));
}

// True when a conversion left Latin letters stranded mid-string, which means the
// input was never Romaji to begin with (an English query like "green tea" comes
// back as "gれえん てあ"). A trailing Latin run is excluded because that is the
// normal half-typed state of real Romaji ("nek" -> "ねk"), which should still show.
export function isStrandedRomaji(kana: string): boolean {
  return /[a-z]/i.test(kana.replace(/[a-z]+$/i, ""));
}
