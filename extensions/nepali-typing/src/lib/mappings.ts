export const HALANTA: string = "्";

export const VOWELS_INDEP: Record<string, string> = {
  a: "अ", aa: "आ", i: "इ", ee: "ई", ii: "ई", u: "उ", oo: "ऊ", uu: "ऊ",
  e: "ए", ai: "ऐ", o: "ओ", au: "औ",
};

export const VOWELS_MATRA: Record<string, string> = {
  a: "", aa: "ा", i: "ि", ee: "ी", ii: "ी", u: "ु", oo: "ू", uu: "ू",
  e: "े", ai: "ै", o: "ो", au: "ौ",
};

export const CONSONANTS: Record<string, string> = {
  k: "क", kh: "ख", g: "ग", gh: "घ", ng: "ङ",
  ch: "च", chh: "छ", j: "ज", jh: "झ",
  T: "ट", Th: "ठ", D: "ड", Dh: "ढ", N: "ण",
  t: "त", th: "थ", d: "द", dh: "ध", n: "न",
  p: "प", ph: "फ", f: "फ", b: "ब", bh: "भ", m: "म",
  y: "य", r: "र", l: "ल", w: "व", v: "व",
  sh: "श", Sh: "ष", s: "स", h: "ह",
  ksh: "क्ष", gy: "ज्ञ", tr: "त्र",
};

export const SPECIALS: Record<string, string> = {
  "**": "ँ", "*": "ं", "\\": "्", ".": "।", "/": "",
};
