/**
 * Convert plain text to Unicode variants
 * Based on https://github.com/davidkonrad/toUnicodeVariant
 * MIT License
 */

export type VariantType =
  | "monospace"
  | "m"
  | "bold"
  | "b"
  | "italic"
  | "i"
  | "bold italic"
  | "bi"
  | "script"
  | "c"
  | "bold script"
  | "bc"
  | "gothic"
  | "g"
  | "gothic bold"
  | "bg"
  | "doublestruck"
  | "d"
  | "sans"
  | "s"
  | "bold sans"
  | "bs"
  | "italic sans"
  | "is"
  | "bold italic sans"
  | "bis"
  | "parenthesis"
  | "p"
  | "circled"
  | "o"
  | "circled negative"
  | "on"
  | "squared"
  | "q"
  | "squared negative"
  | "qn"
  | "fullwidth"
  | "w";

export interface VariantInfo {
  name: string;
  key: VariantType;
  description: string;
}

export const VARIANTS: VariantInfo[] = [
  { name: "Monospace", key: "monospace", description: "Typewriter styled text" },
  { name: "Bold", key: "bold", description: "Bold text" },
  { name: "Italic", key: "italic", description: "Italic text" },
  { name: "Bold Italic", key: "bold italic", description: "Bold and italic text" },
  { name: "Script", key: "script", description: "Cursive/handwriting style" },
  { name: "Bold Script", key: "bold script", description: "Bold cursive style" },
  { name: "Gothic", key: "gothic", description: "Gothic/blackletter style" },
  { name: "Gothic Bold", key: "gothic bold", description: "Bold gothic style" },
  { name: "Double-struck", key: "doublestruck", description: "Outlined letters" },
  { name: "Sans-serif", key: "sans", description: "Clean sans-serif style" },
  { name: "Bold Sans", key: "bold sans", description: "Bold sans-serif" },
  { name: "Italic Sans", key: "italic sans", description: "Italic sans-serif" },
  { name: "Bold Italic Sans", key: "bold italic sans", description: "Bold italic sans-serif" },
  { name: "Parenthesis", key: "parenthesis", description: "Letters in parentheses" },
  { name: "Circled", key: "circled", description: "Letters in circles" },
  { name: "Circled Negative", key: "circled negative", description: "Letters in filled circles" },
  { name: "Squared", key: "squared", description: "Letters in squares" },
  { name: "Squared Negative", key: "squared negative", description: "Letters in filled squares" },
  { name: "Fullwidth", key: "fullwidth", description: "Wide characters" },
];

const string = String.fromCodePoint;

const offsets: Record<string, [number, number]> = {
  m: [0x1d670, 0x1d7f6],
  b: [0x1d400, 0x1d7ce],
  i: [0x1d434, 0x00030],
  bi: [0x1d468, 0x00030],
  c: [0x0001d49c, 0x00030],
  bc: [0x1d4d0, 0x00030],
  g: [0x1d504, 0x00030],
  d: [0x1d538, 0x1d7d8],
  bg: [0x1d56c, 0x00030],
  s: [0x1d5a0, 0x1d7e2],
  bs: [0x1d5d4, 0x1d7ec],
  is: [0x1d608, 0x00030],
  bis: [0x1d63c, 0x00030],
  o: [0x24b6, 0x245f],
  on: [0x0001f150, 0x245f],
  p: [0x1f110, 0x1d7f6],
  q: [0x1f130, 0x00030],
  qn: [0x0001f170, 0x00030],
  w: [0xff21, 0xff10],
};

const variantOffsets: Record<string, string> = {
  monospace: "m",
  bold: "b",
  italic: "i",
  "bold italic": "bi",
  script: "c",
  "bold script": "bc",
  gothic: "g",
  "gothic bold": "bg",
  doublestruck: "d",
  sans: "s",
  "bold sans": "bs",
  "italic sans": "is",
  "bold italic sans": "bis",
  parenthesis: "p",
  circled: "o",
  "circled negative": "on",
  squared: "q",
  "squared negative": "qn",
  fullwidth: "w",
};

const special: Record<string, Record<string, number>> = {
  m: { " ": 0x2000, "-": 0x2013 },
  i: { h: 0x210e },
  c: {
    B: 0x212c,
    E: 0x2130,
    F: 0x2131,
    H: 0x210b,
    I: 0x2110,
    L: 0x2112,
    M: 0x2133,
    R: 0x211b,
    e: 0x1d4ee,
    g: 0x1d4f0,
    o: 0x1d4f8,
  },
  g: { C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 },
  d: { C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119, Q: 0x211a, R: 0x211d, Z: 0x2124 },
  o: {
    "0": 0x24ea,
    "10": 0x2469,
    "11": 0x246a,
    "12": 0x246b,
    "13": 0x246c,
    "14": 0x246d,
    "15": 0x246e,
    "16": 0x246f,
    "17": 0x2470,
    "18": 0x2471,
    "19": 0x2472,
    "20": 0x2473,
  },
  on: {
    "0": 0x24ff,
    "11": 0x24eb,
    "12": 0x24ec,
    "13": 0x24ed,
    "14": 0x24ee,
    "15": 0x24ef,
    "16": 0x24f0,
    "17": 0x24f1,
    "18": 0x24f2,
    "19": 0x24f3,
    "20": 0x24f4,
  },
  p: {
    "1": 0x2474,
    "2": 0x2475,
    "3": 0x2476,
    "4": 0x2477,
    "5": 0x2478,
    "6": 0x2479,
    "7": 0x247a,
    "8": 0x247b,
    "9": 0x247c,
    "10": 0x247d,
    "11": 0x247e,
    "12": 0x247f,
    "13": 0x2480,
    "14": 0x2481,
    "15": 0x2482,
    "16": 0x2483,
    "17": 0x2484,
    "18": 0x2485,
    "19": 0x2486,
    "20": 0x2487,
  },
  q: {
    hv: 0x1f14a,
    mv: 0x1f14b,
    sd: 0x1f14c,
    ss: 0x1f14d,
    ppv: 0x1f14e,
    wc: 0x1f14f,
    cl: 0x1f191,
    cool: 0x1f192,
    free: 0x1f193,
    id: 0x1f194,
    new: 0x1f195,
    ng: 0x1f196,
    ok: 0x1f197,
    sos: 0x1f198,
    "up!": 0x1f199,
    vs: 0x1f19a,
    "3d": 0x1f19b,
    "2ndscr": 0x1f19c,
    "2k": 0x1f19d,
    "4k": 0x1f19e,
    "8k": 0x1f19f,
    "5.1": 0x1f1a0,
    "7.1": 0x1f1a1,
    "22.2": 0x1f1a2,
    "60p": 0x1f1a3,
    "120p": 0x1f1a4,
    d: 0x1f1a5,
    hc: 0x1f1a6,
    hdr: 0x1f1a7,
    "hi-res": 0x1f1a8,
    "loss-less": 0x1f1a9,
    shv: 0x1f1aa,
    uhd: 0x1f1ab,
    vod: 0x1f1ac,
  },
  qn: { ic: 0x1f18b, pa: 0x1f18c, sa: 0x1f18d, ab: 0x1f18e, wc: 0x1f18f },
  w: {
    "!": 0xff01,
    '"': 0xff02,
    "#": 0xff03,
    $: 0xff04,
    "%": 0xff05,
    "&": 0xff06,
    "'": 0xff07,
    "(": 0xff08,
    ")": 0xff09,
    "*": 0xff0a,
    "+": 0xff0b,
    ",": 0xff0c,
    "-": 0xff0d,
    ".": 0xff0e,
    "/": 0xff0f,
    ":": 0xff1a,
    ";": 0xff1b,
    "<": 0xff1c,
    "=": 0xff1d,
    ">": 0xff1e,
    "?": 0xff1f,
    "@": 0xff20,
    "\\": 0xff3c,
    "[": 0xff3b,
    "]": 0xff3d,
    "^": 0xff3e,
    _: 0xff3f,
    "`": 0xff40,
    "{": 0xff5b,
    "|": 0xff5c,
    "}": 0xff5d,
    "~": 0xff5e,
  },
};

// Add lowercase letters to special mappings
for (let i = 97; i <= 122; i++) {
  special["p"][String.fromCharCode(i)] = 0x249c + (i - 97);
  special["w"][String.fromCharCode(i)] = 0xff41 + (i - 97);
}

["on", "q", "qn"].forEach((t) => {
  for (let i = 97; i <= 122; i++) {
    special[t][String.fromCharCode(i)] = offsets[t][0] + (i - 97);
  }
});

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const numbers = "0123456789";

export function toUnicodeVariant(str: string, variant: VariantType): string {
  const type = variantOffsets[variant] || variant;

  if (!offsets[type]) {
    return str;
  }

  // Handle special sequences
  if (typeof str === "string" && special[type] && (special[type][str] || special[type][str.toLowerCase()])) {
    return special[type][str] ? string(special[type][str]) : string(special[type][str.toLowerCase()]);
  }

  let result = "";

  for (const c of str) {
    let index;
    const normalized = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Check if there's a special character mapping for this type
    if (special[type]?.[normalized]) {
      result += string(special[type][normalized]);
      continue;
    }

    // Otherwise use offset-based conversion
    if (type && (index = chars.indexOf(normalized)) > -1) {
      result += string(index + offsets[type][0]);
    } else if (type && (index = numbers.indexOf(normalized)) > -1) {
      result += string(index + offsets[type][1]);
    } else {
      result += c;
    }
  }

  return result;
}
