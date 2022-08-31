export type eColor = "red" | "orange" | "yellow" | "regular";

export interface iWord {
  similarity: number;
  isInformal: boolean;
  isVulgar: boolean;
  term: string;
  targetTerm: string;
  targetSlug: string;
  definition?: string;
}
