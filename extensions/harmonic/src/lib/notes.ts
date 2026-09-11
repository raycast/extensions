// Equal temperament: each semitone is 2^(1/12) apart
// A4 = 440 Hz is the standard reference

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

// Aliases for enharmonic equivalents
const NOTE_ALIASES: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Fb: "E",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  "E#": "F",
  "B#": "C",
  // Flat spelled out
  "D flat": "C#",
  "E flat": "D#",
  "F flat": "E",
  "G flat": "F#",
  "A flat": "G#",
  "B flat": "A#",
  "C flat": "B",
  // Sharp spelled out
  "C sharp": "C#",
  "D sharp": "D#",
  "E sharp": "F",
  "F sharp": "F#",
  "G sharp": "G#",
  "A sharp": "A#",
  "B sharp": "C",
};

// Display names showing enharmonic equivalents
const ENHARMONIC_DISPLAY: Record<string, string> = {
  "C#": "C# / Db",
  "D#": "D# / Eb",
  "F#": "F# / Gb",
  "G#": "G# / Ab",
  "A#": "A# / Bb",
};

export interface NoteInfo {
  name: string;
  displayName: string;
  octave: number;
  frequency: number;
  midiNumber: number;
  scientificName: string;
}

/**
 * Calculate frequency for a given note and octave.
 * A4 = 440 Hz, MIDI note 69.
 * MIDI note number = 12 * (octave + 1) + semitoneIndex
 * frequency = 440 * 2^((midiNote - 69) / 12)
 */
function noteFrequency(semitoneIndex: number, octave: number): number {
  const midiNote = 12 * (octave + 1) + semitoneIndex;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/** Resolve a note name (with aliases) to its canonical sharp name */
export function resolveNoteName(input: string): string | null {
  const trimmed = input.trim();

  // Check direct match
  if (NOTE_NAMES.includes(trimmed as (typeof NOTE_NAMES)[number])) {
    return trimmed;
  }

  // Check aliases (case-insensitive)
  for (const [alias, canonical] of Object.entries(NOTE_ALIASES)) {
    if (alias.toLowerCase() === trimmed.toLowerCase()) {
      return canonical;
    }
  }

  return null;
}

/** Parse scientific pitch notation like "C4", "Ab3", "F#5" */
export function parseScientificNotation(input: string): { noteName: string; octave: number } | null {
  const match = input.match(/^([A-Ga-g][#b]?)\s*(\d)$/);
  if (!match) return null;

  const noteName = resolveNoteName(match[1]);
  if (!noteName) return null;

  return { noteName, octave: parseInt(match[2]) };
}

/** Get info for a specific note at a specific octave */
export function getNoteInfo(noteName: string, octave: number): NoteInfo {
  const semitoneIndex = NOTE_NAMES.indexOf(noteName as (typeof NOTE_NAMES)[number]);
  const frequency = noteFrequency(semitoneIndex, octave);
  const midiNumber = 12 * (octave + 1) + semitoneIndex;

  return {
    name: noteName,
    displayName: ENHARMONIC_DISPLAY[noteName] || noteName,
    octave,
    frequency: Math.round(frequency * 100) / 100,
    midiNumber,
    scientificName: `${noteName}${octave}`,
  };
}

/** Get all octaves (0-8) for a given note name */
export function getAllOctaves(noteName: string): NoteInfo[] {
  const results: NoteInfo[] = [];
  for (let octave = 0; octave <= 8; octave++) {
    results.push(getNoteInfo(noteName, octave));
  }
  return results;
}

/** Get a label for the octave range */
export function getOctaveLabel(octave: number): string {
  if (octave <= 1) return "Sub-bass";
  if (octave === 2) return "Bass";
  if (octave === 3) return "Low";
  if (octave === 4) return "Middle";
  if (octave === 5) return "High";
  if (octave === 6) return "Very High";
  return "Extreme";
}

/** Get a label like "Middle C" for well-known notes */
export function getNotableLabel(noteName: string, octave: number): string | null {
  if (noteName === "C" && octave === 4) return "Middle C";
  if (noteName === "A" && octave === 4) return "Concert A (Tuning Standard)";
  if (noteName === "A" && octave === 0) return "Lowest Piano Key";
  if (noteName === "C" && octave === 8) return "Highest Piano Key";
  return null;
}

/** Get all 12 note names */
export function getAllNoteNames(): string[] {
  return [...NOTE_NAMES];
}

/** Get the semitone index (0-11) for a note name */
export function getSemitoneIndex(noteName: string): number {
  return NOTE_NAMES.indexOf(noteName as (typeof NOTE_NAMES)[number]);
}

export { ENHARMONIC_DISPLAY };
