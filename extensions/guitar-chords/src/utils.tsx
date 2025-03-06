import { chords } from "@tombatossals/chords-db/lib/guitar.json";
import { ChordBoxDot } from "chordbox/dist/types";

import {
  ChordBoxChord,
  ChordDBChord,
  ChordDBDictionary,
  ChordPosition,
  StringDictionary,
  StringsDictionary,
  Query,
} from "./types";

const dbChords: ChordDBDictionary = chords;

const safeSearchChordDbKeys = {
  // chordDb key => valid inputs keys form user (uppercase)
  C: ["C"],
  Csharp: ["C#", "CSHARP"],
  D: ["D"],
  Eb: ["EB", "D#"],
  E: ["E"],
  F: ["F"],
  Fsharp: ["F#", "FSHARP"],
  G: ["G"],
  Ab: ["AB", "G#"],
  A: ["A"],
  Bb: ["BB", "A#"],
  B: ["B"],
} as StringsDictionary;

const safeChordDbChordKeys = {
  C: "C",
  Csharp: "C#",
  D: "D",
  Eb: "Eb",
  E: "E",
  F: "F",
  Fsharp: "F#",
  G: "G",
  Ab: "Ab",
  A: "A",
  Bb: "Bb",
  B: "B",
} as StringDictionary;

const sharpKeys = {
  C: "C",
  Csharp: "C#",
  "C#": "C#",
  D: "D",
  Eb: "D#",
  E: "E",
  F: "F",
  Fsharp: "F#",
  "F#": "F#",
  G: "G",
  Ab: "G#",
  A: "A",
  Bb: "A#",
  B: "B",
} as StringDictionary;

class ChordsDBChordBoxifier {
  private chord: ChordDBChord = { key: "", suffix: "", positions: [] };

  private validateChord(key: string, suffix: string) {
    const maybeSafeChordDbKey = Object.keys(safeSearchChordDbKeys).find((multiKey) => {
      return safeSearchChordDbKeys[multiKey].includes(key.toUpperCase());
    });

    if (!maybeSafeChordDbKey) {
      throw new Error(`Invalid/unavailable key`);
    }

    const safeDbChord: ChordDBChord[] = dbChords[maybeSafeChordDbKey];

    const maybeChordOfKeyInSuffix = safeDbChord.find((chord: ChordDBChord) => {
      return (
        chord.key === safeChordDbChordKeys[maybeSafeChordDbKey] &&
        chord.suffix ===
          suffix
            .split("/")
            .map((part, partIndex) => (!partIndex ? part.toLowerCase() : part.toUpperCase()))
            .join("/")
      );
    });

    if (!maybeChordOfKeyInSuffix) {
      throw new Error(`Invalid/unavailable suffix`);
    }

    return maybeChordOfKeyInSuffix;
  }

  setQuery(query: Query) {
    this.chord = this.validateChord(query.key.trim(), query.suffix.trim());

    return this;
  }

  getPositions() {
    return this.chord.positions.map((position: ChordPosition, positionIndex: number) => {
      const title = `${sharpKeys[this.chord.key]}${this.chord.suffix} (${positionIndex + 1}/${
        this.chord.positions.length
      })`;

      const frets =
        Math.max(...position.frets.filter((fret) => fret >= 1)) -
        Math.min(...position.frets.filter((fret) => fret >= 1), 1) +
        2;

      const baseFret = position.baseFret;

      const dots = position.frets.map((fret, fretIndex) => ({
        fret: fret,
        string: 6 - fretIndex,
      }));

      const dotText = (dot: ChordBoxDot) => position.fingers[6 - dot.string].toString();

      const barres = position.barres;

      return {
        title,
        frets,
        baseFret,
        dots,
        dotText,
        barres,
      };
    }) as ChordBoxChord[];
  }
}

class ChordsDBChords {
  getChords() {
    return Object.keys(dbChords)
      .map((key) => {
        return dbChords[key].map((chord) => ({
          title: `${sharpKeys[key]}${chord.suffix}`,
          key: key,
          sharpKey: sharpKeys[key],
          suffix: chord.suffix,
          positions: chord.positions.length,
        }));
      })
      .flat();
  }
  getKeys() {
    return Object.keys(dbChords).map((key) => ({
      safeKey: key,
      sharpKey: sharpKeys[key],
    }));
  }
}

export { ChordsDBChordBoxifier, ChordsDBChords };
