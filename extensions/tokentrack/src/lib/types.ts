export type ProviderKey = "all" | "codex" | "claude" | "cursor";

export type SourceProviderKey = Exclude<ProviderKey, "all">;

export type UsageEvent = {
  id: string;
  provider: SourceProviderKey;
  timestamp: Date;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCost: number;
  estimatedTokens: boolean;
  sourcePath?: string;
};

export type ModelSummary = {
  model: string;
  totalTokens: number;
  estimatedCost: number;
  count: number;
  estimated: boolean;
};

export type UsageSummary = {
  events: UsageEvent[];
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCost: number;
  hasEstimatedTokens: boolean;
  hasEstimatedCost: boolean;
  byModel: Map<string, ModelSummary>;
};

export type DateRange = {
  start: Date;
  end: Date;
};
