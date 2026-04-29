import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDefaultSkipWords() {
  try {
    const data = readFileSync(join(__dirname, "skip-words.txt"), "utf-8");
    return data
      .split(/\r?\n/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const DEFAULT_SKIP_WORDS = new Set(loadDefaultSkipWords());

const VOWELS = "aeiouyáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵâăêôơưấầẩẫậắằẳẵặếềểễệốồổỗộớờởỡợứừửữự";

// Valid Vietnamese initial consonants, clusters, and vowel-starters.
// Words that don't start with one of these are treated as foreign and skipped.
const ONSETS = ["ngh", "ch", "gh", "gi", "kh", "ng", "nh", "ph", "qu", "th", "tr"];
const CONSONANTS = "bcdđghklmnprstvx";

function isLikelyVietnamese(token) {
  const lower = token.toLowerCase();
  if (lower.length === 0) return false;

  const first = lower[0];

  // Vowel-initial words (áo, ốc, ý...) — includes tone-marked vowels via full VOWELS set
  if (VOWELS.includes(first)) return true;

  // Consonant cluster + vowel (chạ, nghi, thơ...)
  for (const onset of ONSETS) {
    if (lower.startsWith(onset) && lower.length > onset.length && VOWELS.includes(lower[onset.length])) return true;
  }

  // Single consonant + vowel (bán, cá, đi...)
  if (CONSONANTS.includes(first) && lower.length > 1 && VOWELS.includes(lower[1])) return true;

  return false;
}

const TONE_MAP = [
  ["a", "á", "à", "ả", "ã", "ạ"],
  ["â", "ấ", "ầ", "ẩ", "ẫ", "ậ"],
  ["ă", "ắ", "ằ", "ẳ", "ẵ", "ặ"],
  ["e", "é", "è", "ẻ", "ẽ", "ẹ"],
  ["ê", "ế", "ề", "ể", "ễ", "ệ"],
  ["i", "í", "ì", "ỉ", "ĩ", "ị"],
  ["o", "ó", "ò", "ỏ", "õ", "ọ"],
  ["ô", "ố", "ồ", "ổ", "ỗ", "ộ"],
  ["ơ", "ớ", "ờ", "ở", "ỡ", "ợ"],
  ["u", "ú", "ù", "ủ", "ũ", "ụ"],
  ["ư", "ứ", "ừ", "ử", "ữ", "ự"],
  ["y", "ý", "ỳ", "ỷ", "ỹ", "ỵ"],
];

function removeTone(char) {
  for (let row of TONE_MAP) {
    const idx = row.indexOf(char);
    if (idx > 0) return row[0];
  }
  return char;
}

function getBestVowelIndex(word) {
  // Collect all vowel positions
  const allVowels = [];
  for (let i = 0; i < word.length; i++) {
    if (VOWELS.includes(word[i].toLowerCase())) allVowels.push(i);
  }

  // 'i' in "gi" and 'u' in "qu" are consonant clusters, not vowels.
  // Only filter them out when another vowel exists in the word.
  const vowelsInWord =
    allVowels.length > 1
      ? allVowels.filter((idx) => {
          const ch = word[idx].toLowerCase();
          const prev = idx > 0 ? word[idx - 1].toLowerCase() : "";
          if (prev === "q" && ch === "u") return false;
          if (prev === "g" && ch === "i" && (idx === 1 || word[idx - 2].toLowerCase() !== "n")) return false;
          return true;
        })
      : allVowels;

  if (vowelsInWord.length === 0) return -1;
  if (vowelsInWord.length === 1) return vowelsInWord[0];

  const firstIdx = vowelsInWord[0];
  const secondIdx = vowelsInWord[1];
  const first = word[firstIdx].toLowerCase();
  const second = word[secondIdx].toLowerCase();
  const combined = first + second;

  // Glide + main vowel → tone on second vowel
  const toneOnSecond = ["oă", "uy", "uâ", "uô", "uơ", "uê", "iê", "ươ"];
  // "oa", "oe" → tone on second only when followed by a consonant (toàn, khoèn)
  if (["oa", "oe"].includes(combined) && secondIdx !== word.length - 1) return secondIdx;
  if (toneOnSecond.includes(combined)) {
    // Triphthong: uy + vowel → tone on third vowel (e.g. uyên → tone on ê)
    if (vowelsInWord.length >= 3 && combined === "uy") return vowelsInWord[2];
    return secondIdx;
  }
  // Triphthongs not starting with uy: tone on second vowel
  if (vowelsInWord.length >= 3) return secondIdx;

  // Diphthongs where tone stays on first vowel (ai, ay, au, ây, eo, oi, ui...)
  return firstIdx;
}

export function telexTransform(input, customSkipWords = []) {
  const skipWords =
    customSkipWords.length > 0
      ? new Set([...DEFAULT_SKIP_WORDS, ...customSkipWords.map((w) => w.toLowerCase())])
      : DEFAULT_SKIP_WORDS;

  const tokens = input.split(/(\s+)/);

  return tokens
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      // Skip known English words ending in tone-marker letters.
      // Strip surrounding punctuation so "yes," matches "yes".
      const cleanToken = token.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
      if (cleanToken && skipWords.has(cleanToken)) return token;

      let output = "";
      let tone = 0;
      const TONES = { s: 1, f: 2, r: 3, x: 4, j: 5 };
      const MODS = { a: { a: "â", w: "ă" }, e: { e: "ê" }, o: { o: "ô", w: "ơ" }, u: { w: "ư" }, d: { d: "đ" } };

      function findModIdx(str, c) {
        for (let i = str.length - 1; i >= 0; i--) {
          const v = str[i].toLowerCase();
          if (MODS[v] && MODS[v][c]) return i;
        }
        return -1;
      }

      function replaceChar(str, idx, replacement) {
        const orig = str[idx];
        const cased = orig === orig.toUpperCase() ? replacement.toUpperCase() : replacement;
        return str.substring(0, idx) + cased + str.substring(idx + 1);
      }

      for (let i = 0; i < token.length; i++) {
        const c = token[i].toLowerCase();
        const last = output[output.length - 1]?.toLowerCase();

        if (TONES[c] && (i === token.length - 1 || (output.length > 0 && VOWELS.includes(last)))) {
          tone = TONES[c];
          continue;
        }

        const modIdx = findModIdx(output, c);
        if (modIdx === -1) {
          output += token[i];
          continue;
        }

        const replacement = MODS[output[modIdx].toLowerCase()][c];
        output = replaceChar(output, modIdx, replacement);

        // "uo" + w → "ươ": when 'o' becomes 'ơ', also horn the preceding 'u'
        if (replacement === "ơ" && modIdx > 0 && output[modIdx - 1].toLowerCase() === "u") {
          output = replaceChar(output, modIdx - 1, "ư");
        }
      }

      if (!isLikelyVietnamese(output)) return token;

      // Apply the tone
      if (tone > 0) {
        const idx = getBestVowelIndex(output);
        if (idx !== -1) {
          const char = output[idx];
          const base = removeTone(char.toLowerCase());
          for (const row of TONE_MAP) {
            if (row[0] === base) {
              output = replaceChar(output, idx, row[tone]);
              break;
            }
          }
        }
      }
      return output;
    })
    .join("");
}
