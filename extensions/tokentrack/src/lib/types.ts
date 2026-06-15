export type ProviderKey = "all" | "codex" | "claude" | "cursor";

export type SourceProviderKey = Exclude<ProviderKey, "all">;

/** Minimal fields for dashboard aggregation — avoids retaining path/title strings. */
export type UsageMetric = {
  timestamp: Date;
  totalTokens: number;
  estimatedCost: number;
  estimatedTokens: boolean;
};

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
  /** Stable key for grouping events into one chat/session (file path, composer id, etc.). */
  conversationKey?: string;
  /** Human-readable chat title when the source provides one. */
  conversationTitle?: string;
};

export type UsageReaderSink = {
  metric?: (metric: UsageMetric) => void;
  event?: (event: UsageEvent) => void;
};

export type ConversationUsageSummary = {
  key: string;
  title: string;
  /** Rollout/jsonl path or composer id — used by Open Chat. */
  sourcePath?: string;
  totalTokens: number;
  estimatedCost: number;
  eventCount: number;
  lastActive: Date;
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
