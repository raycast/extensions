import { ChordBoxOptions } from "chordbox/dist/types";

type ChordBoxChord = ChordBoxOptions;

type ChordDBChord = {
  key: string;
  suffix: string;
  positions: ChordPosition[];
};

type ChordDBDictionary = {
  [index: string]: ChordDBChord[];
};

type ChordPosition = {
  frets: number[];
  fingers: number[];
  barres: number[];
  baseFret: number;

  // unused - for now... :)
  capo?: boolean;
  midi: number[];
};

type StringDictionary = {
  [index: string]: string;
};

type StringsDictionary = {
  [index: string]: string[];
};

type Query = {
  key: string;
  suffix: string;
};

export type {
  ChordBoxChord,
  ChordDBChord,
  ChordDBDictionary,
  ChordPosition,
  StringDictionary,
  StringsDictionary,
  Query,
};
