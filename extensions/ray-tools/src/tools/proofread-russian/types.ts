export type ProofreadingIssueCategory =
  "spelling" | "punctuation" | "grammar" | "style" | "other";

export interface ProofreadingIssue {
  message: string;
  shortMessage?: string;
  replacements: string[];
  offset: number;
  length: number;
  category: ProofreadingIssueCategory;
  ruleId?: string;
}

export interface ProofreadingResult {
  text: string;
  correctedText: string;
  issues: ProofreadingIssue[];
  language: "ru-RU";
  provider: string;
}

export interface ProofreadingProvider {
  check(text: string): Promise<ProofreadingResult>;
}
