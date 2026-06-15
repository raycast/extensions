export type MatchType = "wildcards" | "regex";

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  matchType: MatchType;
  patterns: string[];
  browser: string;
};
