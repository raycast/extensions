enum Key {
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

enum bw {
  "white" = 0,
  "black" = 1,
}

const bwMap = [
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

type KeyKey = keyof typeof Key;

const keySimpleList: KeyKey[] = [
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

const chromaticName: string[] = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const OctaveKeyCount = 12;

export { Key, keySimpleList, OctaveKeyCount, bw, bwMap, chromaticName };
