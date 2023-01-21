export enum Key {
  "C" = 0,
  "C#" = 1,
  "Db" = 1,
  "D" = 2,
  "D#" = 3,
  "Eb" = 3,
  "E" = 4,
  "F" = 5,
  "F#" = 6,
  "Gb" = 6,
  "G" = 7,
  "G#" = 8,
  "Ab" = 8,
  "A" = 9,
  "A#" = 10,
  "Bb" = 10,
  "B" = 11,
  "Abb" = 7,
  "Bbb" = 9,
  "Cbb" = 10,
  "Dbb" = 0,
  "Ebb" = 2,
  "Fbb" = 3,
  "Gbb" = 5,
  "A##" = 11,
  "B##" = 1,
  "C##" = 2,
  "D##" = 4,
  "E##" = 6,
  "F##" = 7,
  "G##" = 9,
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
