import { buildUsageBuckets } from "./token-chart";
import { groupEventsByConversation } from "./conversation-details";
import { getPeriodRange, type PeriodKey } from "./format";
import type { UsageBucket } from "./token-chart";
import type {
  ConversationUsageSummary,
  SourceProviderKey,
  UsageEvent,
} from "./types";

export type SerializedConversation = {
  key: string;
  title: string;
  totalTokens: number;
  estimatedCost: number;
  eventCount: number;
  lastActive: string;
};

export type PeriodUsageSnapshot = {
  totalTokens: number;
  estimatedCost: number;
  hasEstimatedTokens: boolean;
  hasEstimatedCost: boolean;
  buckets: UsageBucket[];
  conversations: SerializedConversation[];
};

export type ProviderUsageSnapshot = {
  errors: string[];
  periods: Record<PeriodKey, PeriodUsageSnapshot>;
};

function serializeConversation(
  chat: ConversationUsageSummary,
): SerializedConversation {
  return {
    key: chat.key,
    title: chat.title,
    totalTokens: chat.totalTokens,
    estimatedCost: chat.estimatedCost,
    eventCount: chat.eventCount,
    lastActive: chat.lastActive.toISOString(),
  };
}

export function deserializeConversation(
  chat: SerializedConversation,
): ConversationUsageSummary {
  return {
    ...chat,
    lastActive: new Date(chat.lastActive),
  };
}

function summarizePeriod(
  events: UsageEvent[],
): Omit<PeriodUsageSnapshot, "buckets" | "conversations"> {
  let totalTokens = 0;
  let estimatedCost = 0;
  let hasEstimatedTokens = false;
  let hasEstimatedCost = false;

  for (const event of events) {
    totalTokens += event.totalTokens;
    estimatedCost += event.estimatedCost;
    hasEstimatedTokens ||= event.estimatedTokens;
    hasEstimatedCost ||= event.estimatedCost > 0;
  }

  return {
    totalTokens,
    estimatedCost,
    hasEstimatedTokens,
    hasEstimatedCost,
  };
}

export function buildProviderUsageSnapshot(
  events: UsageEvent[],
  errors: string[],
): ProviderUsageSnapshot {
  const periods = {} as Record<PeriodKey, PeriodUsageSnapshot>;

  for (const period of ["today", "week", "month"] as PeriodKey[]) {
    const range = getPeriodRange(period);
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    const filtered = events.filter((e) => {
      const t = e.timestamp.getTime();
      return t >= startMs && t <= endMs;
    });

    periods[period] = {
      ...summarizePeriod(filtered),
      buckets: buildUsageBuckets(period, range, filtered),
      conversations: groupEventsByConversation(filtered).map(
        serializeConversation,
      ),
    };
  }

  return { errors, periods };
}

export function supportsConversationDetailsFromSnapshot(
  _provider: SourceProviderKey,
  snapshot: PeriodUsageSnapshot,
): boolean {
  return snapshot.conversations.length > 0;
}
