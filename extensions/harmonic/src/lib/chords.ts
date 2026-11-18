import { getSemitoneIndex, getNoteInfo, type NoteInfo } from "./notes";

export interface ChordDefinition {
  symbol: string;
  name: string;
  intervals: number[];
  category: string;
  aliases?: string[];
}

export interface ChordResult {
  symbol: string;
  fullName: string;
  rootNote: string;
  definition: ChordDefinition;
  notes: NoteInfo[];
  category: string;
}

// Intervals are in semitones from root
const CHORD_DEFINITIONS: ChordDefinition[] = [
  // Triads
  { symbol: "", name: "Major", intervals: [0, 4, 7], category: "Triad" },
  { symbol: "m", name: "Minor", intervals: [0, 3, 7], category: "Triad" },
  {
    symbol: "dim",
    name: "Diminished",
    intervals: [0, 3, 6],
    category: "Triad",
  },
  {
    symbol: "aug",
    name: "Augmented",
    intervals: [0, 4, 8],
    category: "Triad",
    aliases: ["+"],
  },
  {
    symbol: "sus2",
    name: "Suspended 2nd",
    intervals: [0, 2, 7],
    category: "Triad",
  },
  {
    symbol: "sus4",
    name: "Suspended 4th",
    intervals: [0, 5, 7],
    category: "Triad",
    aliases: ["sus"],
  },

  // Seventh chords
  {
    symbol: "7",
    name: "Dominant 7th",
    intervals: [0, 4, 7, 10],
    category: "Seventh",
  },
  {
    symbol: "maj7",
    name: "Major 7th",
    intervals: [0, 4, 7, 11],
    category: "Seventh",
    aliases: ["M7", "Δ7"],
  },
  {
    symbol: "m7",
    name: "Minor 7th",
    intervals: [0, 3, 7, 10],
    category: "Seventh",
  },
  {
    symbol: "m(maj7)",
    name: "Minor Major 7th",
    intervals: [0, 3, 7, 11],
    category: "Seventh",
    aliases: ["mM7", "m(M7)"],
  },
  {
    symbol: "dim7",
    name: "Diminished 7th",
    intervals: [0, 3, 6, 9],
    category: "Seventh",
  },
  {
    symbol: "m7b5",
    name: "Half-Diminished 7th",
    intervals: [0, 3, 6, 10],
    category: "Jazz",
    aliases: ["ø7"],
  },
  {
    symbol: "7sus4",
    name: "Dominant 7th sus4",
    intervals: [0, 5, 7, 10],
    category: "Seventh",
  },
  {
    symbol: "7sus2",
    name: "Dominant 7th sus2",
    intervals: [0, 2, 7, 10],
    category: "Seventh",
  },

  // Sixth chords
  {
    symbol: "6",
    name: "Major 6th",
    intervals: [0, 4, 7, 9],
    category: "Sixth",
  },
  {
    symbol: "m6",
    name: "Minor 6th",
    intervals: [0, 3, 7, 9],
    category: "Sixth",
  },

  // Extended chords
  {
    symbol: "9",
    name: "Dominant 9th",
    intervals: [0, 4, 7, 10, 14],
    category: "Extended",
  },
  {
    symbol: "maj9",
    name: "Major 9th",
    intervals: [0, 4, 7, 11, 14],
    category: "Extended",
    aliases: ["M9", "Δ9"],
  },
  {
    symbol: "m9",
    name: "Minor 9th",
    intervals: [0, 3, 7, 10, 14],
    category: "Extended",
  },
  {
    symbol: "11",
    name: "Dominant 11th",
    intervals: [0, 4, 7, 10, 14, 17],
    category: "Extended",
  },
  {
    symbol: "m11",
    name: "Minor 11th",
    intervals: [0, 3, 7, 10, 14, 17],
    category: "Extended",
  },
  {
    symbol: "13",
    name: "Dominant 13th",
    intervals: [0, 4, 7, 10, 14, 17, 21],
    category: "Extended",
  },
  {
    symbol: "maj13",
    name: "Major 13th",
    intervals: [0, 4, 7, 11, 14, 17, 21],
    category: "Extended",
    aliases: ["M13", "Δ13"],
  },
  {
    symbol: "m13",
    name: "Minor 13th",
    intervals: [0, 3, 7, 10, 14, 17, 21],
    category: "Extended",
  },

  // Altered chords
  {
    symbol: "7#5",
    name: "Augmented 7th",
    intervals: [0, 4, 8, 10],
    category: "Altered",
    aliases: ["7aug", "+7"],
  },
  {
    symbol: "7b5",
    name: "Dominant 7th flat 5",
    intervals: [0, 4, 6, 10],
    category: "Altered",
  },
  {
    symbol: "7#9",
    name: "Dominant 7th sharp 9",
    intervals: [0, 4, 7, 10, 15],
    category: "Altered",
    aliases: ["7(#9)"],
  },
  {
    symbol: "7b9",
    name: "Dominant 7th flat 9",
    intervals: [0, 4, 7, 10, 13],
    category: "Altered",
    aliases: ["7(b9)"],
  },
  {
    symbol: "7#11",
    name: "Dominant 7th sharp 11",
    intervals: [0, 4, 7, 10, 18],
    category: "Lydian",
    aliases: ["7(#11)"],
  },
  {
    symbol: "maj7#11",
    name: "Major 7th sharp 11",
    intervals: [0, 4, 7, 11, 18],
    category: "Lydian",
    aliases: ["Δ7#11", "M7#11"],
  },

  // Jazz voicings
  { symbol: "add9", name: "Add 9", intervals: [0, 4, 7, 14], category: "Jazz" },
  {
    symbol: "madd9",
    name: "Minor Add 9",
    intervals: [0, 3, 7, 14],
    category: "Jazz",
  },
  {
    symbol: "6/9",
    name: "Six Nine",
    intervals: [0, 4, 7, 9, 14],
    category: "Jazz",
  },
  {
    symbol: "m6/9",
    name: "Minor Six Nine",
    intervals: [0, 3, 7, 9, 14],
    category: "Jazz",
  },
  {
    symbol: "9#11",
    name: "9th sharp 11",
    intervals: [0, 4, 7, 10, 14, 18],
    category: "Lydian",
  },

  // Modal chords
  {
    symbol: "7b9b13",
    name: "Phrygian Dominant",
    intervals: [0, 4, 7, 10, 13, 20],
    category: "Modal",
  },
  {
    symbol: "m7#5",
    name: "Minor 7th sharp 5",
    intervals: [0, 3, 8, 10],
    category: "Modal",
  },
  {
    symbol: "7alt",
    name: "Altered Dominant",
    intervals: [0, 4, 6, 10, 13],
    category: "Jazz",
    aliases: ["alt"],
  },

  // Power chord
  { symbol: "5", name: "Power Chord", intervals: [0, 7], category: "Power" },

  // Quartal
  {
    symbol: "sus4add9",
    name: "Quartal voicing",
    intervals: [0, 5, 7, 14],
    category: "Modal",
  },
  {
    symbol: "m7sus4",
    name: "Minor 7th sus4",
    intervals: [0, 5, 7, 10],
    category: "Modal",
    aliases: ["m7sus"],
  },
];

/** Parse a chord symbol like "Cmaj7", "Dm7b5", "F#7#11" */
export function parseChord(input: string): { rootNote: string; suffix: string } | null {
  const match = input.match(/^([A-Ga-g][#b]?)(.*)/);
  if (!match) return null;

  const rootLetter = match[1].charAt(0).toUpperCase();
  const accidental = match[1].slice(1);
  const rootNote = rootLetter + accidental;
  const suffix = match[2];

  return { rootNote, suffix };
}

/** Find chord definitions matching a suffix */
function findChordDefinition(suffix: string): ChordDefinition | null {
  const normalized = suffix.trim();

  for (const def of CHORD_DEFINITIONS) {
    if (def.symbol === normalized) return def;
    if (def.aliases?.some((a) => a === normalized)) return def;
  }

  // Case-insensitive fallback
  for (const def of CHORD_DEFINITIONS) {
    if (def.symbol.toLowerCase() === normalized.toLowerCase()) return def;
    if (def.aliases?.some((a) => a.toLowerCase() === normalized.toLowerCase())) return def;
  }

  return null;
}

/** Resolve a chord input string into a full ChordResult */
export function resolveChord(input: string, octave = 4): ChordResult | null {
  const parsed = parseChord(input);
  if (!parsed) return null;

  // Resolve root note to canonical name
  const NOTE_ALIASES: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
    Cb: "B",
    Fb: "E",
    "E#": "F",
    "B#": "C",
  };
  const rootNote = NOTE_ALIASES[parsed.rootNote] || parsed.rootNote;

  const rootIndex = getSemitoneIndex(rootNote);
  if (rootIndex === -1) return null;

  const definition = findChordDefinition(parsed.suffix);
  if (!definition) return null;

  // Build chord notes
  const notes: NoteInfo[] = definition.intervals.map((interval) => {
    const absoluteSemitone = rootIndex + interval;
    const noteIndex = absoluteSemitone % 12;
    const noteOctave = octave + Math.floor(absoluteSemitone / 12);
    const ALL_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return getNoteInfo(ALL_NOTES[noteIndex], noteOctave);
  });

  return {
    symbol: `${parsed.rootNote}${definition.symbol}`,
    fullName: `${parsed.rootNote} ${definition.name}`,
    rootNote: parsed.rootNote,
    definition,
    notes,
    category: definition.category,
  };
}

/** Get all chord suggestions for autocomplete, optionally filtered by root */
export function getChordSuggestions(searchText: string): Array<{
  symbol: string;
  fullName: string;
  category: string;
  rootNote: string;
}> {
  const parsed = parseChord(searchText);
  if (!parsed) return [];

  const rootNote = parsed.rootNote;
  const suffixFilter = parsed.suffix.toLowerCase();

  return CHORD_DEFINITIONS.filter((def) => {
    if (!suffixFilter) return true;
    return (
      def.symbol.toLowerCase().startsWith(suffixFilter) ||
      def.name.toLowerCase().includes(suffixFilter) ||
      def.category.toLowerCase().includes(suffixFilter) ||
      (def.aliases?.some((a) => a.toLowerCase().startsWith(suffixFilter)) ?? false)
    );
  }).map((def) => ({
    symbol: `${rootNote}${def.symbol}`,
    fullName: `${rootNote} ${def.name}`,
    category: def.category,
    rootNote,
  }));
}

/** Get all chord definitions */
export function getAllChordDefinitions(): ChordDefinition[] {
  return CHORD_DEFINITIONS;
}
