const VOWELS = "aeiouyáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵâăêôơưấầẩẫậắằẳẵặếềểễệốồổỗộớờởỡợứừửữự";
const BASE_VOWEL_MAP = { â: "a", ă: "a", ê: "e", ô: "o", ơ: "o", ư: "u" };

const VALID_INITIALS_1 = new Set("bcdđghklmnprstvx".split(""));
const VALID_INITIALS_2 = new Set(["ch", "gh", "gi", "kh", "kr", "ng", "nh", "ph", "qu", "th", "tr"]);
const VALID_FINALS_1 = new Set(["c", "k", "m", "n", "p", "t", "i", "o", "u", "y"]);
const VALID_FINALS_2 = new Set(["ch", "ng", "nh"]);
const VALID_VOWEL_PAIRS = new Set([
  "ai",
  "ao",
  "au",
  "ay",
  "ei",
  "eo",
  "eu",
  "ia",
  "ie",
  "iu",
  "oa",
  "oe",
  "oi",
  "ua",
  "ue",
  "ui",
  "uo",
  "uy",
  "uu",
  "ye",
]);

// Pairs that are only valid when at least one char has a diacritic
// e.g. "ei" alone → invalid, "êi" (ê→e normalized) → valid
const DIACRITIC_ONLY_PAIRS = new Set(["ei", "eu", "ye", "ue", "uu"]);

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

// Precomputed lookup: tone-marked vowel → base vowel (e.g. "ấ" → "â", "à" → "a")
const TONE_TO_BASE = (() => {
  const m = new Map();
  for (const row of TONE_MAP) {
    const base = row[0];
    for (let i = 1; i < row.length; i++) m.set(row[i], base);
  }
  return m;
})();

// Precomputed: any vowel → normalized base (tone removed + circumflex/horn/breve flattened)
const NORMALIZE_MAP = (() => {
  const m = new Map();
  for (const ch of VOWELS) {
    const noTone = TONE_TO_BASE.get(ch) || ch;
    m.set(ch, BASE_VOWEL_MAP[noTone] || noTone);
  }
  return m;
})();

function removeTone(ch) {
  return TONE_TO_BASE.get(ch) || ch;
}

function normalizeToBaseVowel(ch) {
  return NORMALIZE_MAP.get(ch) || ch;
}

function isValidVowelPair(chA, chB) {
  const baseA = normalizeToBaseVowel(chA);
  const baseB = normalizeToBaseVowel(chB);
  const base = baseA + baseB;
  const hasDiacritic = chA !== baseA || chB !== baseB;

  if (DIACRITIC_ONLY_PAIRS.has(base) && !hasDiacritic) return false;
  if (!VALID_VOWEL_PAIRS.has(base)) return false;
  return true;
}

function isValidVietnameseWord(word) {
  const raw = word.toLowerCase();
  const w = raw
    .split("")
    .filter((ch) => /\p{L}/u.test(ch))
    .join("");
  const len = w.length;
  if (len === 0) return false;
  let i = 0;

  if (len >= 3 && w.startsWith("ngh") && len > 3) i = 3;
  else if (len >= 2 && VALID_INITIALS_2.has(w.slice(0, 2)) && len > 2) i = 2;
  else if (VALID_INITIALS_1.has(w[0])) i = 1;

  let glideConsumed = false;
  if (i < len && w[i] === "o" && i + 1 < len && "ae".includes(removeTone(w[i + 1]))) {
    if (i === 0 || w[i - 1] !== "q") {
      i++;
      glideConsumed = true;
    }
  } else if (i < len && (w[i] === "u" || w[i] === "ư") && i + 1 < len && VOWELS.includes(w[i + 1])) {
    if (i === 0 || w[i - 1] !== "q") {
      i++;
      glideConsumed = true;
    }
  }

  if (i >= len || !VOWELS.includes(w[i])) return false;

  const vowelStart = i;
  while (i < len && VOWELS.includes(w[i])) i++;

  for (let j = vowelStart; j < i - 1; j++) {
    if (!isValidVowelPair(w[j], w[j + 1])) return false;
  }

  if (glideConsumed) {
    const glideIdx = vowelStart - 1;
    if (!isValidVowelPair(w[glideIdx], w[vowelStart])) return false;
  }

  const rest = w.slice(i);
  if (rest.length === 0) return true;
  if (rest.length >= 2 && VALID_FINALS_2.has(rest.slice(0, 2))) return rest.length === 2;
  if (VALID_FINALS_1.has(rest[0])) return rest.length === 1;

  return false;
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

export function telexTransform(input, skipWords = []) {
  const skipSet = skipWords.length > 0 ? new Set(skipWords.map((w) => w.toLowerCase())) : new Set();

  const tokens = input.split(/(\s+)/);

  return tokens
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      // Skip known English words (exact or prefix match).
      // Strip surrounding punctuation so "yes," matches "yes".
      const cleanToken = token.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
      if (cleanToken && skipSet.has(cleanToken)) return token;
      if (cleanToken) {
        for (const word of skipWords) {
          if (cleanToken.startsWith(word.toLowerCase())) return token;
        }
      }

      let output = "";
      let tone = 0;
      const TONES = { s: 1, f: 2, r: 3, x: 4, j: 5 };
      const MODS = { a: { a: "â", w: "ă" }, e: { e: "ê" }, o: { o: "ô", w: "ơ" }, u: { w: "ư" }, d: { d: "đ" } };

      function findModIdx(str, c) {
        for (let i = str.length - 1; i >= 0; i--) {
          const v = str[i].toLowerCase();
          if (!MODS[v] || !MODS[v][c]) continue;

          // "w" targeting "a" → prefer "u" before it to form "ưa" diphthong
          if (c === "w" && v === "a" && i > 0) {
            const prev = str[i - 1].toLowerCase();
            const notQu = i < 2 || str[i - 2].toLowerCase() !== "q";
            if (prev === "u" && MODS["u"]["w"] && notQu) return i - 1;
          }

          return i;
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

        if (
          TONES[c] &&
          (i === token.length - 1 ||
            (output.length > 0 && VOWELS.includes(last)) ||
            (i + 1 < token.length && !/\p{L}/u.test(token[i + 1])))
        ) {
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

        // "uo" + w → "ươ"
        if (replacement === "ơ" && modIdx > 0 && output[modIdx - 1].toLowerCase() === "u") {
          output = replaceChar(output, modIdx - 1, "ư");
        }
      }

      if (!isValidVietnameseWord(output)) return token;

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
