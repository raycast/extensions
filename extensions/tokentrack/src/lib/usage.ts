import type {
  DateRange,
  SourceProviderKey,
  UsageEvent,
  UsageReaderSink,
} from "./types";
import { refreshLivePricingIfStale } from "./pricing";
import {
  CLAUDE_DATA_PATH,
  CODEX_DATA_PATH,
  CURSOR_DATA_PATH,
} from "./source-paths";
import { readClaudeUsage } from "./sources/claude";
import { readCodexUsage } from "./sources/codex";
import {
  clearCursorApiCache,
  readCursorConversationBreakdown,
  readCursorUsage,
} from "./sources/cursor";
import { groupEventsByConversation } from "./conversation-details";
import { createCodexBudgetAccumulator } from "./codex-budget";
import { getPeriodRange, getUsageLoadRange, type PeriodKey } from "./format";
import {
  clearUsageSnapshotCache as clearSnapshotCache,
  readLastGoodUsageSnapshot,
  readUsageSnapshotCache,
  snapshotHasUsage,
  writeUsageSnapshotCache,
} from "./usage-cache";
import {
  createUsageSnapshotBuilder,
  type ProviderUsageSnapshot,
} from "./usage-snapshot";
import type { ConversationUsageSummary } from "./types";
import { isInRange } from "./sources/shared";

const REJECT_MSG_MAX = 42;

function briefRejectReason(reason: unknown): string {
  const raw = reason instanceof Error ? reason.message : "Source load failed";
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length <= REJECT_MSG_MAX ? t : `${t.slice(0, REJECT_MSG_MAX - 1)}…`;
}

export function clearUsageSnapshotCache(): void {
  clearSnapshotCache();
  clearCursorApiCache();
}

export async function loadUsage(
  range: DateRange,
  provider: SourceProviderKey,
  options?: { force?: boolean },
): Promise<ProviderUsageSnapshot> {
  if (!options?.force) {
    const cached = readUsageSnapshotCache(provider, range);
    if (cached) return cached;
  }

  void refreshLivePricingIfStale();

  try {
    const builder = createUsageSnapshotBuilder();
    const codexBudget =
      provider === "codex" ? createCodexBudgetAccumulator() : undefined;
    const errors = await streamProviderUsage(range, provider, {
      metric: (metric) => {
        builder.addMetric(metric);
        codexBudget?.addMetric(metric);
      },
    });
    const snapshot = builder.build(errors);
    if (codexBudget) snapshot.codexBudget = codexBudget.build();

    if (!snapshotHasUsage(snapshot) && errors.length > 0) {
      const stale = await readLastGoodUsageSnapshot(provider, range);
      if (stale) {
        const merged: ProviderUsageSnapshot = {
          ...stale,
          errors: [...errors],
        };
        writeUsageSnapshotCache(provider, range, merged);
        return merged;
      }
    }

    writeUsageSnapshotCache(provider, range, snapshot);
    return snapshot;
  } catch (reason) {
    const stale = await readLastGoodUsageSnapshot(provider, range);
    if (stale) {
      const merged: ProviderUsageSnapshot = {
        ...stale,
        errors: [...stale.errors, briefRejectReason(reason)],
      };
      writeUsageSnapshotCache(provider, range, merged);
      return merged;
    }
    const builder = createUsageSnapshotBuilder();
    return builder.build([briefRejectReason(reason)]);
  }
}

async function streamProviderUsage(
  range: DateRange,
  provider: SourceProviderKey,
  sink: UsageReaderSink,
): Promise<string[]> {
  switch (provider) {
    case "codex":
      return readCodexUsage(CODEX_DATA_PATH, range, sink);
    case "claude":
      return readClaudeUsage(CLAUDE_DATA_PATH, range, sink);
    case "cursor":
      return readCursorUsage(CURSOR_DATA_PATH, range, sink);
  }
}

/** Lazy-loaded per-chat breakdown (deferred from dashboard to save heap). */
export async function loadConversationDetails(
  period: PeriodKey,
  provider: SourceProviderKey,
): Promise<ConversationUsageSummary[]> {
  const loadRange = getUsageLoadRange();
  const periodRange = getPeriodRange(period);

  if (provider === "cursor") {
    const { events } = await readCursorConversationBreakdown(
      CURSOR_DATA_PATH,
      loadRange,
    );
    const filtered = events.filter((event) =>
      isInRange(event.timestamp, periodRange.start, periodRange.end),
    );
    return groupEventsByConversation(filtered);
  }

  const events: UsageEvent[] = [];
  await streamProviderUsage(loadRange, provider, {
    event: (event) => events.push(event),
  });
  const filtered = events.filter((event) =>
    isInRange(event.timestamp, periodRange.start, periodRange.end),
  );
  return groupEventsByConversation(filtered);
}
