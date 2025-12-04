/**
 * Modified from implementation in @RadLikeWhoa/Countable
 * @source https://github.com/RadLikeWhoa/Countable
 * @license MIT
 */

import { ICountResult } from "./types";

const decode = (string: string) => {
  const output = [];
  let counter = 0;
  const length = string.length;

  while (counter < length) {
    const value = string.charCodeAt(counter++);

    if (value >= 0xd800 && value <= 0xdbff && counter < length) {
      // It's a high surrogate, and there is a next character.

      const extra = string.charCodeAt(counter++);

      if ((extra & 0xfc00) == 0xdc00) {
        // Low surrogate.
        output.push(((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000);
      } else {
        // It's an unmatched surrogate; only append this code unit, in case the
        // next code unit is the high surrogate of a surrogate pair.

        output.push(value);
        counter--;
      }
    } else {
      output.push(value);
    }
  }

  return output;
};

/**
 * Check if a character code is a CJK character
 */
const isCJKCharCode = (code: number): boolean => {
  // Common CJK ranges - fast path first
  if (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3040 && code <= 0x30ff) || // Hiragana and Katakana
    (code >= 0xac00 && code <= 0xd7af) // Hangul Syllables
  ) {
    return true;
  }

  // Less common CJK ranges
  return (
    (code >= 0x3400 && code <= 0x4dbf) || // Extension A
    (code >= 0xf900 && code <= 0xfaff) || // Compatibility Ideographs
    (code >= 0x20000 && code <= 0x2a6df) || // Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // Extension D
    (code >= 0x2b820 && code <= 0x2ceaf) || // Extension E
    (code >= 0x2ceb0 && code <= 0x2ebef) // Extension F
  );
};

/**
 * Check if a character code is a CJK punctuation
 */
const isCJKPunctuation = (code: number): boolean => {
  return (
    (code >= 0x3000 && code <= 0x303f) || // CJK Symbols and Punctuation
    (code >= 0xff01 && code <= 0xff0f) || // Fullwidth punctuation (！＂＃＄％＆＇（）＊＋，－．／)
    (code >= 0xff1a && code <= 0xff20) || // Fullwidth punctuation (：；＜＝＞？＠)
    (code >= 0xff3b && code <= 0xff40) || // Fullwidth punctuation (［＼］＾＿｀)
    (code >= 0xff5b && code <= 0xff65) || // Fullwidth punctuation (｛｜｝～)
    (code >= 0xfe30 && code <= 0xfe4f) // CJK Compatibility Forms
  );
};

/**
 * Adapted work from
 * Most of the performance improvements are based on the works of @epmatsw.
 * @source <http://goo.gl/SWOLB>
 */
export const count = (text: string, includeWhitespace: boolean): ICountResult => {
  const trimmed = text.trim();

  let words = 0;

  if (trimmed) {
    const withoutWesternPunctuation = trimmed.replace(/['";:,.?¿\-!¡]+/g, "");
    const wordSegments = withoutWesternPunctuation.split(/\s+/);

    for (const segment of wordSegments) {
      if (!segment) continue;

      let nonCJKStart = 0;
      let j = 0;

      while (j < segment.length) {
        const charCode = segment.charCodeAt(j);

        if (isCJKPunctuation(charCode)) {
          // If there are non-CJK characters before this punctuation, count them as one word
          if (j > nonCJKStart) {
            words++;
          }
          nonCJKStart = j + 1;
          j++;
          continue;
        }

        if (isCJKCharCode(charCode)) {
          // If there are non-CJK characters before this CJK character, count them as one word
          if (j > nonCJKStart) {
            words++;
          }

          words++; // Count this CJK character as one word
          nonCJKStart = j + 1;
        }

        j++;
      }

      // Count any trailing non-CJK characters as one word
      if (nonCJKStart < segment.length) {
        words++;
      }
    }
  }

  return {
    paragraphs: trimmed ? (trimmed.match(/\n+/g) || []).length + 1 : 0,
    sentences: trimmed ? (trimmed.match(/[.?!…]+./g) || []).length + 1 : 0,
    words: words,
    reading_time: Math.ceil(words / 275),
    speaking_time: Math.ceil(words / 180),
    characters: includeWhitespace ? decode(text).length : trimmed ? decode(trimmed.replace(/\s/g, "")).length : 0,
  };
};
