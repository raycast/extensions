export type PrimerResult = {
  cleanSequence: string;
  primerLength: number;

  forward: string;
  reverse: string;

  forwardGC: number;
  reverseGC: number;

  forwardTm: number;
  reverseTm: number;
};
