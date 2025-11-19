type ScaleIntervals = number[];

export enum ScaleName {
  Major = "major",
  Minor = "minor",
}

export class ParseError extends Error {}

const SCALES: Record<ScaleName, ScaleIntervals> = {
  [ScaleName.Major]: [0, 2, 4, 5, 7, 9, 11],
  [ScaleName.Minor]: [0, 2, 3, 5, 7, 8, 10],
};

const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getScaleNotes(rootNote: string, scale: ScaleName): string[] {
  const rootIndex = CHROMATIC.indexOf(rootNote);

  if (rootIndex === -1) {
    throw new ParseError("Unknown root");
  }

  return SCALES[scale].map((interval) => CHROMATIC[(rootIndex + interval) % CHROMATIC.length]);
}

export function chordStringToScaleNotes(rootNote: string, scale: ScaleName): string {
  return getScaleNotes(rootNote, scale).join(" ");
}
