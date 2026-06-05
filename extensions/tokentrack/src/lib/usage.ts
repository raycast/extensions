import type { DateRange, SourceProviderKey } from "./types";
import { refreshLivePricingIfStale } from "./pricing";
import { readClaudeUsage } from "./sources/claude";
import { readCodexUsage } from "./sources/codex";
import { readCursorUsage } from "./sources/cursor";
import {
  buildProviderUsageSnapshot,
  type ProviderUsageSnapshot,
} from "./usage-snapshot";

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
  provider: SourceProviderKey,
): Promise<ProviderUsageSnapshot> {
  await refreshLivePricingIfStale();

  try {
    const result = await readProviderUsage(preferences, range, provider);
    const events = result.events.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
    return buildProviderUsageSnapshot(events, result.errors);
  } catch (reason) {
    return buildProviderUsageSnapshot([], [briefRejectReason(reason)]);
  }
}

async function readProviderUsage(
  preferences: SourcePreferences,
  range: DateRange,
  provider: SourceProviderKey,
) {
  switch (provider) {
    case "codex":
      return readCodexUsage(preferences.codexPath, range);
    case "claude":
      return readClaudeUsage(preferences.claudePath, range);
    case "cursor":
      return readCursorUsage(preferences.cursorPath, range);
  }
}
