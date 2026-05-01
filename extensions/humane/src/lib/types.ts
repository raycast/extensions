export type IntensityLevel = "clean" | "rewrite" | "strip";

export interface Phase1Stats {
  phrasesReplaced: number;
  buzzwordsReplaced: number;
  contractionsApplied: number;
}

export interface HumanifierResult {
  original: string;
  final: string;
  changes: Change[];
  stats: {
    phase1: Phase1Stats;
  };
}

export interface Change {
  type: "replacement" | "insertion" | "deletion";
  original: string;
  replacement: string;
  position: number;
}
