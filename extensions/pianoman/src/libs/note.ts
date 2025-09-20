import { bwMap, chromaticName, Key, OctaveKeyCount } from "./key";

class Note {
  key: Key;
  octave: number;

  constructor(key: Key, octave: number) {
    if (typeof key === "undefined") throw "undefined key";
    this.key = key;
    this.octave = octave;
  }

  play() {
    console.log("Not implemented");
  }

  getChromaticName() {
    return chromaticName[this.key];
  }

  toString() {
    return chromaticName[this.key] + this.octave;
  }

  valueOf() {
    return this.octave * OctaveKeyCount + this.key;
  }

  get bw() {
    return bwMap[this.key];
  }
}

export { Note };
