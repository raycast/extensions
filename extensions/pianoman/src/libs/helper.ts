import { encode } from "js-base64";
import { Chord } from "./chord";
import { chords } from "./db";
import { Key } from "./key";

export function getSvgBase64(svg: string): string {
  return `data:image/svg+xml;base64,${encode(svg)}`;
}

/**
 * Trims each line to help with multi-line texts
 * like markdown
 */
export function trimLines(content: string | string[]) {
  const lines = Array.isArray(content) ? content : content.split("\n");
  const firstIndex = 0;
  const lastIndex = lines.length - 1;

  return (
    lines
      // Drop the first and last line if only carriage return
      .filter((line, index) =>
        (index === firstIndex || index === lastIndex) && line.trim() === "" ? false : true,
      )
      .map((line) => line.trim())
  );
}

/**
 * Find the key by 1-2 first letter like C, C#, Fb
 */
export function findNoteByName(rawValue?: string) {
  if (!rawValue) {
    return undefined;
  }

  const noteValue = ["#", "b"].includes(rawValue.substring(1, 2))
    ? rawValue.substring(0, 2)
    : rawValue.substring(0, 1).toUpperCase();

  // Check the letter matches with value values
  if (!Object.keys(Key).includes(noteValue)) {
    return undefined;
  }

  return noteValue;
}

export function getHighlightTable(chord: Chord) {
  const highlightTable: boolean[] = Array(12 * 3).fill(false);
  const startIndex = chord.key;
  highlightTable[startIndex] = true;
  chord.intervals.reduce((previousValue, currentValue) => {
    const accumulate = previousValue + currentValue;
    highlightTable[accumulate] = true;
    return accumulate;
  }, startIndex);
  return highlightTable;
}

export function chordAlignMid(highlightTable: boolean[]): boolean[] {
  // if all the notes are in first 2/3 of the keyboard (3 octaves)
  if (highlightTable.slice(24).every((h) => h === false)) {
    // move notes to the middle octave
    return Array(12).fill(false).concat(highlightTable.slice(0, 24));
  } else {
    // otherwise, do not move notes. Notes will use octave 4 as base
    return highlightTable;
  }
}

export function findChordByName(key: string, chordName: string) {
  return chords[key].find((c) => {
    if (c.name === chordName) return true;
    return false;
  });
}

// C-flat.. -> Cb
export function urlDecodeKey(key: string | undefined): string | undefined {
  if (key) {
    return key.replace("-flat", "b").replace("-sharp", "#");
  } else {
    return undefined;
  }
}
// C# -> C-sharp
export function urlEncodeKey(key: string): string {
  return key.replace("#", "-sharp").replace("b", "-flat");
}

// #->sharp  /->_  ' '->-
export function urlEncodeChord(chordName: string): string {
  return chordName.replace(/#/g, "sharp").replace(/\//g, "_").replace(/ /g, "-");
}

export function urlDecodeChord(chordName: string | undefined): string | undefined {
  if (chordName) {
    return chordName.replace(/sharp/g, "#").replace(/_/g, "/").replace(/-/g, " ");
  } else {
    return undefined;
  }
}

export function chordFilterByKeyword(kw: string) {
  return (chord: Chord) => {
    kw = kw.toLowerCase().replace(" ", "");
    const fullName = chord.fullName.toLowerCase().replace(" ", "");
    const alias = chord.alias.map((str: string) => str.toLowerCase().replace(" ", ""));
    const allNames = [fullName, ...alias];
    return allNames.some((name) => name.indexOf(kw) !== -1);
  };
}

export const delay = (t: number) => new Promise((resolve) => setTimeout(resolve, t));

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}
