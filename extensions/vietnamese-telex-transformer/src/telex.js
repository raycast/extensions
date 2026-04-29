// Common English words ending in tone-marker letters (s, f, r, x, j)
// that should NOT be transformed. Case-insensitive match.
const SKIP_WORDS = new Set([
  "access",
  "actor",
  "box",
  "bus",
  "class",
  "color",
  "complex",
  "doctor",
  "door",
  "error",
  "ex",
  "favor",
  "fix",
  "floor",
  "focus",
  "for",
  "fox",
  "if",
  "index",
  "major",
  "mass",
  "minor",
  "minus",
  "mix",
  "monitor",
  "motor",
  "nor",
  "of",
  "or",
  "pass",
  "plus",
  "process",
  "proof",
  "relax",
  "roof",
  "self",
  "sensor",
  "six",
  "status",
  "stress",
  "stuff",
  "success",
  "us",
  "virus",
  "yes",
]);

const VOWELS = "aeiouyáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵâăêôơưấầẩẫậắằẳẵặếềểễệốồổỗộớờởỡợứừửữự";

// Valid Vietnamese initial consonants, clusters, and vowel-starters.
// Words that don't start with one of these are treated as foreign and skipped.
const VALID_ONSETS = {
  clusters3: ["ngh"],
  clusters2: ["ch", "gh", "gi", "kh", "ng", "nh", "ph", "qu", "th", "tr"],
  consonants: "bcdđghklmnprstvx",
};

function isLikelyVietnamese(token) {
  const lower = token.toLowerCase();
  if (lower.length === 0) return false;

  const first = lower[0];

  // Vowel-initial words (áo, ốc, ý...) — includes tone-marked vowels via full VOWELS set
  if (VOWELS.includes(first)) return true;

  // 3-char cluster: ngh + vowel (nghĩ, nghiêng...)
  for (const onset of VALID_ONSETS.clusters3) {
    if (lower.startsWith(onset) && lower.length > onset.length && VOWELS.includes(lower[onset.length])) return true;
  }

  // 2-char clusters: ch, gh, gi, kh, ng, nh, ph, qu, th, tr + vowel
  for (const onset of VALID_ONSETS.clusters2) {
    if (lower.startsWith(onset) && lower.length > onset.length && VOWELS.includes(lower[onset.length])) return true;
  }

  // Single consonant + vowel (bán, cá, đi...)
  if (VALID_ONSETS.consonants.includes(first) && lower.length > 1 && VOWELS.includes(lower[1])) return true;

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
  const vowelsInWord = [];
  for (let i = 0; i < word.length; i++) {
    if (VOWELS.includes(word[i].toLowerCase())) vowelsInWord.push(i);
  }

  if (vowelsInWord.length === 0) return -1;
  if (vowelsInWord.length === 1) return vowelsInWord[0];

  // Logic for clusters like 'ay', 'au', 'ai'
  const firstIdx = vowelsInWord[0];
  const secondIdx = vowelsInWord[1];
  const first = word[firstIdx].toLowerCase();
  const second = word[secondIdx].toLowerCase();
  const combined = first + second;

  // If the word ends in a consonant after the vowels (like 'vậy'),
  // the tone usually lands on the second vowel if it's a 'complex' vowel (â, ê, ô)
  // Otherwise, default to the first vowel for simple clusters.
  // Tone on second vowel: when first vowel is a medial/glide (o, u, i)
  const toneOnSecond = ["oă", "uy", "uâ", "uô", "uơ", "uê", "iê", "ươ"];
  // "oa", "oe" → tone on second only when followed by a consonant (toàn, khoèn)
  // at word-end, tone stays on first vowel (hỏa, khỏe)
  if (["oa", "oe"].includes(combined) && secondIdx !== word.length - 1) return secondIdx;
  if (toneOnSecond.includes(combined)) {
    // Triphthong: uy + vowel → tone on third vowel (e.g. uyên → tone on ê)
    if (vowelsInWord.length >= 3 && combined === "uy") return vowelsInWord[2];
    return secondIdx;
  }
  // Triphthongs not starting with uy: tone on second vowel
  if (vowelsInWord.length >= 3) return secondIdx;

  // For 'ay', 'au', 'ai', 'ây', 'eo', 'oi', 'ui' → tone usually on the first vowel
  return firstIdx;
}

export function telexTransform(input) {
  const tokens = input.split(/(\s+)/);

  return tokens
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      // Skip known English words ending in tone-marker letters
      if (SKIP_WORDS.has(token.toLowerCase().trim())) return token;

      let output = "";
      let tone = 0;
      const TONES = { s: 1, f: 2, r: 3, x: 4, j: 5 };
      const MODS = { a: { a: "â", w: "ă" }, e: { e: "ê" }, o: { o: "ô", w: "ơ" }, u: { w: "ư" }, d: { d: "đ" } };

      // Find the nearest vowel (scanning backwards) that can be modified by `c`
      const findModIdx = (str, c) => {
        for (let i = str.length - 1; i >= 0; i--) {
          const v = str[i].toLowerCase();
          if (MODS[v] && MODS[v][c]) return i;
        }
        return -1;
      };

      // Pass 1: Build the word and extract the tone
      for (let i = 0; i < token.length; i++) {
        const c = token[i].toLowerCase();
        const last = output[output.length - 1]?.toLowerCase();

        if (TONES[c] && (i === token.length - 1 || (output.length > 0 && VOWELS.includes(last)))) {
          tone = TONES[c];
        } else {
          const modIdx = findModIdx(output, c);
          if (modIdx !== -1) {
            const orig = output[modIdx];
            const base = orig.toLowerCase();
            const replacement = MODS[base][c];
            output =
              output.substring(0, modIdx) +
              (orig === orig.toUpperCase() ? replacement.toUpperCase() : replacement) +
              output.substring(modIdx + 1);

            // "uo" + w → "ươ": when 'o' becomes 'ơ', also horn the preceding 'u'
            if (replacement === "ơ" && modIdx > 0 && output[modIdx - 1].toLowerCase() === "u") {
              const p = output[modIdx - 1];
              output = output.substring(0, modIdx - 1) + (p === p.toUpperCase() ? "Ư" : "ư") + output.substring(modIdx);
            }
          } else {
            output += token[i];
          }
        }
      }

      // Skip words that don't start with a valid Vietnamese onset after modifier processing
      if (!isLikelyVietnamese(output)) return token;

      // Pass 2: Apply the tone
      if (tone > 0) {
        const idx = getBestVowelIndex(output);
        if (idx !== -1) {
          const char = output[idx];
          const base = removeTone(char.toLowerCase());
          for (let row of TONE_MAP) {
            if (row[0] === base) {
              const newChar = char === char.toUpperCase() ? row[tone].toUpperCase() : row[tone];
              output = output.substring(0, idx) + newChar + output.substring(idx + 1);
              break;
            }
          }
        }
      }
      return output;
    })
    .join("");
}
