import { FILLERS_CLASS, INVISIBLE_CLASS, NON_KEYBOARD_CLASS, SPECIAL_SPACES_CLASS, codePointToHex } from "./sets";

export interface CharacterGroupSummary {
  label: string;
  count: number;
  codePoints: string[];
}

export interface AnalysisResult {
  totalCharacters: number;
  totalWords: number;
  invisible: CharacterGroupSummary;
  nonKeyboard: CharacterGroupSummary;
  specialSpaces: CharacterGroupSummary;
}

export function analyzeText(text: string): AnalysisResult {
  const totalCharacters = [...text].length;
  const totalWords = text
    .replace(new RegExp(`${INVISIBLE_CLASS}|${FILLERS_CLASS}`, "gu"), "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;

  const invMatches = text.match(new RegExp(`${INVISIBLE_CLASS}`, "gu")) ?? [];
  const nonKeyboardMatches = text.match(new RegExp(`${NON_KEYBOARD_CLASS}`, "gu")) ?? [];
  const specialSpaceMatches = text.match(new RegExp(`${SPECIAL_SPACES_CLASS}`, "gu")) ?? [];

  return {
    totalCharacters,
    totalWords,
    invisible: {
      label: "Invisible Characters",
      count: invMatches.length,
      codePoints: uniqueCodePoints(invMatches),
    },
    nonKeyboard: {
      label: "Non-Keyboard Unicode",
      count: nonKeyboardMatches.length,
      codePoints: uniqueCodePoints(nonKeyboardMatches),
    },
    specialSpaces: {
      label: "Special Spaces",
      count: specialSpaceMatches.length,
      codePoints: uniqueCodePoints(specialSpaceMatches),
    },
  };
}

function uniqueCodePoints(chars: string[]): string[] {
  const set = new Set<string>();
  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined) set.add(codePointToHex(cp));
  }
  return [...set];
}
