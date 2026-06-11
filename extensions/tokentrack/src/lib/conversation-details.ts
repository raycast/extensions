import type {
  ConversationUsageSummary,
  SourceProviderKey,
  UsageEvent,
} from "./types";

const TITLE_MAX = 80;

export function truncateTitle(text: string, max = TITLE_MAX): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function supportsConversationDetails(
  _provider: SourceProviderKey,
  events: UsageEvent[],
): boolean {
  return events.some((e) => e.conversationKey);
}

export function groupEventsByConversation(
  events: UsageEvent[],
): ConversationUsageSummary[] {
  const byKey = new Map<string, ConversationUsageSummary>();

  for (const event of events) {
    if (!event.conversationKey) continue;

    const existing = byKey.get(event.conversationKey);
    if (!existing) {
      byKey.set(event.conversationKey, {
        key: event.conversationKey,
        title:
          truncateTitle(event.conversationTitle ?? "") || fallbackTitle(event),
        sourcePath: event.sourcePath ?? event.conversationKey,
        totalTokens: event.totalTokens,
        estimatedCost: event.estimatedCost,
        eventCount: 1,
        lastActive: event.timestamp,
      });
      continue;
    }

    existing.totalTokens += event.totalTokens;
    existing.estimatedCost += event.estimatedCost;
    existing.eventCount += 1;
    if (event.timestamp.getTime() > existing.lastActive.getTime()) {
      existing.lastActive = event.timestamp;
    }
    if (
      event.conversationTitle &&
      (!existing.title || existing.title === fallbackTitle(event))
    ) {
      existing.title = truncateTitle(event.conversationTitle);
    }
  }

  return [...byKey.values()].sort(
    (a, b) => b.lastActive.getTime() - a.lastActive.getTime(),
  );
}

function fallbackTitle(event: UsageEvent): string {
  if (event.conversationKey?.startsWith("claude:")) {
    return "Untitled chat";
  }
  if (event.sourcePath?.endsWith(".jsonl")) {
    const base = event.sourcePath.split("/").pop() ?? event.sourcePath;
    const withoutExt = base.replace(/\.jsonl$/i, "");
    if (withoutExt.startsWith("rollout-")) {
      return truncateTitle(
        withoutExt.replace(/^rollout-\d{4}-\d{2}-\d{2}T/, ""),
      );
    }
    return truncateTitle(withoutExt);
  }
  if (event.conversationKey) {
    return truncateTitle(event.conversationKey.slice(0, 8));
  }
  return "Untitled chat";
}
