import type { ForecastResponse, ResetEvidence, ResetRecord } from "../api/forecast-schema";

export type HistoryFilter = "all" | "resets" | "announcements" | "banked";
export type HistoryItem = ResetRecord & { evidence?: ResetEvidence };

export function safeSourceUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function isConfirmedReset(record: ResetRecord): boolean {
  return record.type === "forced-reset" || record.type === "compensation";
}

export function latestReset(response: ForecastResponse, now = new Date()): HistoryItem | undefined {
  return resetHistory(response).find(
    (record) => isConfirmedReset(record) && Date.parse(record.dateTime) <= now.getTime(),
  );
}

export function resetHistory(response: ForecastResponse, filter: HistoryFilter = "all"): HistoryItem[] {
  const evidenceBySource = new Map(
    response.evidence.filter((item) => item.sourceUrl).map((item) => [item.sourceUrl, item]),
  );
  const recordedSources = new Set(response.history.map((record) => record.sourceUrl).filter(Boolean));
  const records: HistoryItem[] = response.history.map((record) => ({
    ...record,
    evidence: record.sourceUrl ? evidenceBySource.get(record.sourceUrl) : undefined,
  }));

  // Ledger records supersede their original announcement. Keep reset-intent
  // evidence that has not yet been classified in the ledger as an announcement.
  for (const evidence of response.evidence) {
    if (evidence.kind !== "reset-intent" || (evidence.sourceUrl && recordedSources.has(evidence.sourceUrl))) continue;
    records.push({
      id: `announcement:${evidence.id}`,
      dateTime: evidence.createdAt,
      title: "Reset announcement",
      description: evidence.reasoning,
      type: "announcement",
      sourceLabel: evidence.author,
      sourceUrl: evidence.sourceUrl,
      evidence,
    });
  }

  return records
    .filter((record) => {
      if (filter === "resets") return isConfirmedReset(record);
      if (filter === "announcements") return record.type === "announcement";
      if (filter === "banked") return record.type === "banked-reset";
      return true;
    })
    .sort((a, b) => Date.parse(b.dateTime) - Date.parse(a.dateTime) || a.id.localeCompare(b.id));
}

export function recordLabel(record: ResetRecord): string {
  switch (record.type) {
    case "forced-reset":
      return "Confirmed Reset";
    case "compensation":
      return "Compensation";
    case "banked-reset":
      return "Banked Reset";
    case "announcement":
      return "Announcement";
    default:
      return "Other Record";
  }
}
