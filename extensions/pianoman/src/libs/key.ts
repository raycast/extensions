export enum Key {
  "C" = 0,
  "C#" = 1,
  "Db" = Key["C#"],
  "D" = 2,
  "D#" = 3,
  "Eb" = Key["D#"],
  "E" = 4,
  "F" = 5,
  "F#" = 6,
  "Gb" = Key["F#"],
  "G" = 7,
  "G#" = 8,
  "Ab" = Key["G#"],
  "A" = 9,
  "A#" = 10,
  "Bb" = Key["A#"],
  "B" = 11,
  "Abb" = Key["G"],
  "Bbb" = Key["A"],
  "Cbb" = Key["A#"],
  "Dbb" = Key["C"],
  "Ebb" = Key["D"],
  "Fbb" = Key["D#"],
  "Gbb" = Key["F"],
  "A##" = Key["B"],
  "B##" = Key["C#"],
  "C##" = Key["D"],
  "D##" = Key["E"],
  "E##" = Key["F#"],
  "F##" = Key["G"],
  "G##" = Key["A"],
}

export enum bw {
  "white" = 0,
  "black" = 1,
}

export const bwMap = [
  bw.white,
  bw.black,
  bw.white,
  bw.black,
  bw.white,
  bw.white,
  bw.black,
  bw.white,
  bw.black,
  bw.white,
  bw.black,
  bw.white,
];

export type KeyKey = keyof typeof Key;

export const keySimpleList: KeyKey[] = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
];

export type NoteMap = {
  name: string;
  aliases?: string[];
};
export const noteMap: NoteMap[] = [
  { name: "C" },
  { name: "Db", aliases: ["C#"] },
  { name: "D" },
  { name: "Eb", aliases: ["D#"] },
  { name: "E" },
  { name: "F" },
  { name: "F#" },
  { name: "G" },
  { name: "Ab", aliases: ["G#"] },
  { name: "A" },
  { name: "Bb", aliases: ["A#"] },
  { name: "B" },
];

export const chromaticName: string[] = noteMap.map((entry) => entry.name);
export const OctaveKeyCount = 12;
