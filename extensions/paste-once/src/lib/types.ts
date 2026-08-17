export type Aggressiveness = "low" | "normal" | "high";

export const SCORE_THRESHOLD: Record<Aggressiveness, number> = {
  low: 3,
  normal: 2,
  high: 1,
};

export interface TrimConfig {
  aggressiveness: Aggressiveness;
  preserveBlankLines: boolean;
  removeBoxDrawing: boolean;
  flattenClaudeCodePrompts: boolean;
}

export interface TrimResult {
  original: string;
  trimmed: string;
  wasTransformed: boolean;
}

export interface URLQueryParamRule {
  domain: string;
  keepParams: Set<string>;
}

export function defaultTrimConfig(partial: Partial<TrimConfig> = {}): TrimConfig {
  return {
    aggressiveness: "normal",
    preserveBlankLines: false,
    removeBoxDrawing: true,
    flattenClaudeCodePrompts: true,
    ...partial,
  };
}
