import type { LogRow } from "./api";

export interface LogGroup {
  title: "Today" | "Yesterday" | "Earlier";
  rows: LogRow[];
}

export function formatLogCost(quota: number, quotaPerUnit: number): string {
  if (quota <= 0 || quotaPerUnit <= 0) return "$0";
  const value = quota / quotaPerUnit;
  if (value < 0.0001) {
    return `$${value.toFixed(8).replace(/0+$/, "")}`;
  }
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(4)}`;
}

export function formatRequestId(requestId?: string): string {
  if (!requestId) return "Unavailable";
  return requestId.length > 12 ? `${requestId.slice(0, 12)}…` : requestId;
}

export function requestMetrics(
  row: LogRow,
  quotaPerUnit: number,
): { tokens: string; cost: string; latency: string } {
  return {
    tokens: `${(row.prompt_tokens + row.completion_tokens).toLocaleString()} tok`,
    cost: formatLogCost(row.quota, quotaPerUnit),
    latency: row.use_time === 0 ? "<1s" : `${row.use_time}s`,
  };
}

export function groupLogs(rows: LogRow[], now = Date.now()): LogGroup[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const groups: LogGroup[] = [
    { title: "Today", rows: [] },
    { title: "Yesterday", rows: [] },
    { title: "Earlier", rows: [] },
  ];
  for (const row of rows) {
    const timestamp = row.created_at * 1000;
    const index =
      timestamp >= todayStart ? 0 : timestamp >= yesterdayStart ? 1 : 2;
    groups[index].rows.push(row);
  }
  return groups.filter((group) => group.rows.length > 0);
}
