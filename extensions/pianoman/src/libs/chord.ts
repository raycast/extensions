import { chromaticName, Key } from "./key";

type SerializeFeature = { key: number; intervals: number[] };

class Chord {
  key: Key;
  intervals: number[];
  alias: string[];
  fullName: string;
  quality: string;
  tonic: string;
  inversions: Chord[];

  constructor(key: Key, intervals: number[]) {
    this.key = key;
    this.intervals = intervals;
    this.alias = [];
    this.fullName = "";
    this.quality = "";
    this.inversions = [];
    this.tonic = "";
  }

  get name(): string {
    if (this.fullName) return this.fullName;
    return this.alias[0];
  }

  get possibleNames(): string[] {
    if (this.fullName) return [this.fullName, ...this.alias];
    return this.alias;
  }

  cutoff(n: number): void {
    while (this.key + this.sum(this.intervals) >= n) {
      this.intervals.splice(this.intervals.length - 1, 1);
    }
  }

  clone(): Chord {
    const chord = new Chord(this.key, [...this.intervals]);
    chord.alias = [...this.alias];
    chord.fullName = this.fullName;
    chord.quality = this.quality;
    chord.tonic = this.tonic;
    chord.inversions = this.inversions.map((inv) => inv.clone());
    return chord;
  }

  sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0);
  }

  calcInversions() {
    if (this.intervals.length === 3 || this.intervals.length === 4) {
      this.inversions = [];
      for (let i = 0; i < this.intervals.length - 1; i++) {
        // (i+1)th inversion
        let key = this.key + this.sum(this.intervals.slice(0, i + 2));
        key %= 12;
        const intervalAboveRoot = this.intervals.slice(i + 1);
        intervalAboveRoot[0] = 0;
        const intervalBelowRoot = this.intervals.slice(0, i + 1);
        intervalBelowRoot[0] = 12 - this.sum(this.intervals);
        let interval = [...intervalAboveRoot, ...intervalBelowRoot];
        // re-position if it has negative interval
        if (interval.some((x) => x < 0)) {
          // convert from accumulative to absolute interval
          for (let i = 1; i < interval.length; i++) {
            interval[i] += interval[i - 1];
          }
          // if still has negative
          if (interval.some((x) => x < 0)) {
            interval = interval.map((x) => {
              if (x >= 0) return x;
              return x + 12;
            });
          }
          // re-position
          interval.sort((a, b) => a - b);
          // convert back to accumulative interval
          for (let i = interval.length - 1; i > 0; i--) {
            interval[i] -= interval[i - 1];
          }
        }
        const invChord = new Chord(key, interval);
        invChord.alias = this.alias.map((str) => `${str}/${chromaticName[invChord.key]}`);
        this.inversions.push(invChord);
      }
    }
  }

  serialize() {
    const data: SerializeFeature = { key: this.key, intervals: this.intervals };
    return JSON.stringify(data);
  }

  static deserialize(str: string) {
    const data: SerializeFeature = JSON.parse(str);
    return new Chord(data.key, data.intervals);
  }

  toString() {
    return this.serialize();
  }
}

export { Chord };
