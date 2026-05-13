import type { DateRange, UsageEvent } from "./types";
import { refreshLivePricingIfStale } from "./pricing";
import { readClaudeUsage } from "./sources/claude";
import { readCodexUsage } from "./sources/codex";
import { readCursorUsage } from "./sources/cursor";

const REJECT_MSG_MAX = 42;

function briefRejectReason(reason: unknown): string {
  const raw = reason instanceof Error ? reason.message : "Source load failed";
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length <= REJECT_MSG_MAX ? t : `${t.slice(0, REJECT_MSG_MAX - 1)}…`;
}

type SourcePreferences = {
  codexPath: string;
  claudePath: string;
  cursorPath: string;
};

export async function loadUsage(
  preferences: SourcePreferences,
  range: DateRange,
) {
  await refreshLivePricingIfStale();

  const results = await Promise.allSettled([
    readCodexUsage(preferences.codexPath, range),
    readClaudeUsage(preferences.claudePath, range),
    readCursorUsage(preferences.cursorPath, range),
  ]);

  const events: UsageEvent[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      events.push(...result.value.events);
      errors.push(...result.value.errors);
    } else {
      errors.push(briefRejectReason(result.reason));
    }
  }

  // No event-count cap. The previous `.slice(0, 500)` silently dropped the
  // oldest assistant turns once a month's worth of Claude history grew past
  // the cap, which roughly halved the reported monthly spend for power users.
  // Claude dedup happens in the source adapter, so duplicates from
  // resumed/forked sessions don't bloat this array.
  return {
    events: events.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    ),
    errors,
  };
}
