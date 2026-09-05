import { escapeHtml, unescapeHtml } from "./shared";

export function sortLines(text: string, direction: "asc" | "desc" = "asc"): string {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .sort(
      (a, b) =>
        a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true }) * (direction === "asc" ? 1 : -1),
    )
    .join("\n");
}

export function analyzeText(text: string): string {
  const words = text.trim() ? text.trim().split(/\s+/u) : [];
  const lines = text ? text.split(/\r?\n/).length : 0;
  const graphemes = [...new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(text)].length;
  return JSON.stringify(
    {
      caracteres: graphemes,
      caracteresSemEspacos: [...text.replace(/\s/gu, "")].length,
      palavras: words.length,
      linhas: lines,
      bytesUtf8: Buffer.byteLength(text, "utf8"),
    },
    null,
    2,
  );
}

export function countOccurrences(
  text: string,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): number {
  if (!query) return 0;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(wholeWord ? `\\b${escaped}\\b` : escaped, caseSensitive ? "gu" : "giu");
  return [...text.matchAll(expression)].length;
}

export function convertHtml(text: string, operation: string): string {
  return operation === "decode" ? unescapeHtml(text) : escapeHtml(text);
}

export function splitString(text: string, delimiter: string, output: string): string {
  const separator = delimiter === "\\n" ? /\r?\n/ : delimiter;
  const parts = text.split(separator).map((item) => item.trim());
  if (output === "json") return JSON.stringify(parts, null, 2);
  if (output === "lines") return parts.join("\n");
  return parts.join(", ");
}

export function characterInfo(text: string): string {
  const character = [...text][0];
  if (!character) throw new Error("Informe um caractere.");
  const point = character.codePointAt(0) ?? 0;
  return JSON.stringify(
    {
      caractere: character,
      unicode: `U+${point.toString(16).toUpperCase().padStart(4, "0")}`,
      decimal: point,
      hexadecimal: `0x${point.toString(16).toUpperCase()}`,
      utf8: [...Buffer.from(character, "utf8")]
        .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
        .join(" "),
    },
    null,
    2,
  );
}

export function reverseText(text: string): string {
  return [...new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(text)]
    .map((part) => part.segment)
    .reverse()
    .join("");
}

export function convertCase(text: string, mode: string): string {
  switch (mode) {
    case "upper":
      return text.toLocaleUpperCase("pt-BR");
    case "lower":
      return text.toLocaleLowerCase("pt-BR");
    case "title":
      return text
        .toLocaleLowerCase("pt-BR")
        .replace(/(^|\s|[-–—])\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
    case "sentence":
      return text
        .toLocaleLowerCase("pt-BR")
        .replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
    case "camel": {
      const words = wordsForIdentifier(text);
      return words.map((word, index) => (index === 0 ? word : capitalize(word))).join("");
    }
    case "pascal":
      return wordsForIdentifier(text).map(capitalize).join("");
    case "snake":
      return wordsForIdentifier(text).join("_");
    case "kebab":
      return wordsForIdentifier(text).join("-");
    default:
      return text;
  }
}

function wordsForIdentifier(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function replaceLineBreaks(text: string, replacement: string): string {
  return text.replace(/\r?\n/g, replacement.replace(/\\n/g, "\n").replace(/\\t/g, "\t"));
}

const commonCorrections: Record<string, string> = {
  concerteza: "com certeza",
  derrepente: "de repente",
  excessão: "exceção",
  excessões: "exceções",
  geito: "jeito",
  menas: "menos",
  paralização: "paralisação",
  previlégio: "privilégio",
  quiz: "quis",
  seje: "seja",
  atraz: "atrás",
  voçê: "você",
};

export function correctCommonPortuguese(text: string): string {
  return text.replace(/\p{L}+/gu, (word) => {
    const corrected = commonCorrections[word.toLocaleLowerCase("pt-BR")];
    if (!corrected) return word;
    if (word === word.toLocaleUpperCase("pt-BR")) return corrected.toLocaleUpperCase("pt-BR");
    if (word[0] === word[0]?.toLocaleUpperCase("pt-BR")) return capitalize(corrected);
    return corrected;
  });
}

function mapAsciiRange(text: string, upperStart: number, lowerStart: number, digitStart?: number): string {
  return [...text]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code >= 65 && code <= 90) return String.fromCodePoint(upperStart + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(lowerStart + code - 97);
      if (digitStart !== undefined && code >= 48 && code <= 57)
        return String.fromCodePoint(digitStart + code - 48);
      return character;
    })
    .join("");
}

export function fancyTextVariants(text: string): string {
  const variants = [
    ["Negrito", mapAsciiRange(text, 0x1d400, 0x1d41a, 0x1d7ce)],
    ["Itálico", mapAsciiRange(text, 0x1d434, 0x1d44e)],
    ["Monoespaçado", mapAsciiRange(text, 0x1d670, 0x1d68a, 0x1d7f6)],
    ["Sans-serif", mapAsciiRange(text, 0x1d5a0, 0x1d5ba, 0x1d7e2)],
    ["Sans-serif negrito", mapAsciiRange(text, 0x1d5d4, 0x1d5ee, 0x1d7ec)],
    ["Small caps", toSmallCaps(text)],
    ["Tachado", [...text].map((character) => `${character}\u0336`).join("")],
    ["Sublinhado", [...text].map((character) => `${character}\u0332`).join("")],
    ["Circundado", circled(text)],
  ];
  return variants.map(([label, value]) => `${label}: ${value}`).join("\n");
}

function toSmallCaps(text: string): string {
  const from = "abcdefghijklmnopqrstuvwxyz";
  const to = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ";
  return [...text.toLowerCase()].map((character) => to[from.indexOf(character)] ?? character).join("");
}

function circled(text: string): string {
  return [...text]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x24b6 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x24d0 + code - 97);
      if (code >= 49 && code <= 57) return String.fromCodePoint(0x2460 + code - 49);
      if (character === "0") return "⓪";
      return character;
    })
    .join("");
}

export const symbolCollections = {
  Desenvolvimento: "✓ ✗ ⚠ ℹ ⌘ ⌥ ⇧ ⌃ ↵ ⎋ ⌫ ⌦ ␣ … • → ← ↑ ↓ ⇒ ⇐ ≠ ≤ ≥ ≈ ∞",
  Formas: "■ □ ▪ ▫ ● ○ ◉ ◌ ◆ ◇ ▲ △ ▼ ▽ ◀ ◁ ▶ ▷ ★ ☆",
  Setas: "← ↑ → ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇐ ⇑ ⇒ ⇓ ⇔ ➜ ➤ ➥ ➦ ➧ ➨",
  Moedas: "$ ¢ £ ¤ ¥ € ₩ ₽ ₹ ₿ R$",
  Matemática: "+ − × ÷ ± = ≠ ≈ < > ≤ ≥ ∞ √ ∑ ∏ ∫ ∂ ∆ π ° % ‰",
  Social: "♡ ♥ ❤ ღ ☺ ☻ ☀ ☁ ☂ ☕ ✉ ☎ ♪ ♫ ⚡ ✨",
};

const units = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const teens = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const tens = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const hundreds = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function underThousand(value: number): string {
  if (value === 0) return "";
  if (value === 100) return "cem";
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  if (hundred) parts.push(hundreds[hundred]);
  if (rest) {
    if (hundred) parts.push("e");
    if (rest < 10) parts.push(units[rest]);
    else if (rest < 20) parts.push(teens[rest - 10]);
    else {
      parts.push(tens[Math.floor(rest / 10)]);
      if (rest % 10) parts.push("e", units[rest % 10]);
    }
  }
  return parts.join(" ");
}

export function numberToPortuguese(input: string): string {
  const value = Number(input.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value) || Math.abs(value) > 999_999_999_999)
    throw new Error("Use um número entre -999.999.999.999 e 999.999.999.999.");
  const integer = Math.trunc(Math.abs(value));
  if (integer === 0) return units[0];
  const scales = [
    { divisor: 1_000_000_000, singular: "bilhão", plural: "bilhões" },
    { divisor: 1_000_000, singular: "milhão", plural: "milhões" },
    { divisor: 1_000, singular: "mil", plural: "mil" },
    { divisor: 1, singular: "", plural: "" },
  ];
  let remaining = integer;
  const parts: string[] = [];
  for (const scale of scales) {
    const chunk = Math.floor(remaining / scale.divisor);
    if (!chunk) continue;
    remaining %= scale.divisor;
    if (scale.divisor === 1_000 && chunk === 1) parts.push("mil");
    else parts.push(`${underThousand(chunk)} ${chunk === 1 ? scale.singular : scale.plural}`.trim());
  }
  return `${value < 0 ? "menos " : ""}${parts.join(remaining > 0 && remaining < 100 ? " e " : " ")}`;
}
