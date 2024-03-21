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
 * Adapted work from
 * Most of the performance improvements are based on the works of @epmatsw.
 * @source <http://goo.gl/SWOLB>
 */
export const count = (text: string, includeWhitespace: boolean): ICountResult => {
  const trimmed = text.trim();
  const words = trimmed ? (trimmed.replace(/['";:,.?¿\-!¡]+/g, "").match(/\S+/g) || []).length : 0;

  return {
    paragraphs: trimmed ? (trimmed.match(/\n+/g) || []).length + 1 : 0,
    sentences: trimmed ? (trimmed.match(/[.?!…]+./g) || []).length + 1 : 0,
    words: words,
    reading_time: Math.ceil(words / 275),
    speaking_time: Math.ceil(words / 180),
    characters: includeWhitespace ? decode(text).length : trimmed ? decode(trimmed.replace(/\s/g, "")).length : 0,
  };
};
