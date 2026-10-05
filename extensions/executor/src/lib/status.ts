import type { Connection, SpecNumber } from "./types";

export const STALE_REPORT_MS = 24 * 60 * 60 * 1000;

/** Native menu sections share an action namespace, so visible titles must stay distinct. */
export function statusConnectionTitles(rows: { id: string; title: string; workspace: string }[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.title, (counts.get(row.title) ?? 0) + 1);
  const candidates = rows.map((row) => ({
    ...row,
    title: (counts.get(row.title) ?? 0) > 1 ? `${row.title} (${row.workspace})` : row.title,
  }));
  const used = new Set<string>();
  return new Map(
    candidates.map((row) => {
      let title = row.title;
      let suffix = 2;
      while (used.has(title) || (title !== row.title && candidates.some((item) => item.title === title))) {
        title = `${row.title} (${suffix++})`;
      }
      used.add(title);
      return [row.id, title];
    }),
  );
}

export type StatusState = "reported" | "attention" | "unverified" | "empty" | "unavailable";

export interface StatusSnapshot {
  state: StatusState;
  total: number;
  reportedHealthy: number;
  needsAttention: number;
  unverified: number;
  stale: number;
  oldestCheckedAt?: number;
  menuBarTitle?: string;
  tooltip: string;
  repairConnections: Connection[];
}

function timestamp(value: SpecNumber | null | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value < 1e12 ? value * 1000 : value;
}

export function recordedHealthAge(value: SpecNumber | null | undefined, now = Date.now()): string {
  const checkedAt = timestamp(value);
  if (checkedAt === undefined) return "No recorded check";
  const elapsed = Math.max(0, now - checkedAt);
  if (elapsed < 60_000) return "Checked just now";
  if (elapsed < 3_600_000) return `Checked ${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `Checked ${Math.floor(elapsed / 3_600_000)}h ago`;
  return `Checked ${Math.floor(elapsed / 86_400_000)}d ago`;
}

export function connectionNeedsAttention(connection: Connection): boolean {
  return (
    ["expired", "degraded", "misconfigured"].includes(connection.lastHealth?.status ?? "") ||
    connection.missingOAuthScopes.length > 0
  );
}

export function connectionIssue(connection: Connection): string {
  const issues: string[] = [];
  const status = connection.lastHealth?.status;
  if (status && status !== "healthy" && status !== "unknown") {
    issues.push(status.charAt(0).toUpperCase() + status.slice(1));
  }
  if (connection.missingOAuthScopes.length > 0) {
    issues.push("Missing Scopes");
  }
  return issues.join(" · ") || "No reported issue";
}

export function buildStatusSnapshot(connections: Connection[], error?: Error, now = Date.now()): StatusSnapshot {
  const repairConnections = connections.filter(connectionNeedsAttention);
  const reportedHealthy = connections.filter(
    (connection) => connection.lastHealth?.status === "healthy" && connection.missingOAuthScopes.length === 0,
  ).length;
  const unverified = connections.filter(
    (connection) => !connection.lastHealth || connection.lastHealth.status === "unknown",
  ).length;
  const stale = connections.filter((connection) => {
    const checkedAt = timestamp(connection.lastHealth?.checkedAt);
    return checkedAt !== undefined && now - checkedAt > STALE_REPORT_MS;
  }).length;
  const checkedAtValues = connections
    .map((connection) => timestamp(connection.lastHealth?.checkedAt))
    .filter((value): value is number => value !== undefined);
  const oldestCheckedAt = checkedAtValues.length > 0 ? Math.min(...checkedAtValues) : undefined;
  const needsAttention = repairConnections.length;

  if (error) {
    return {
      state: "unavailable",
      total: connections.length,
      reportedHealthy,
      needsAttention,
      unverified,
      stale,
      oldestCheckedAt,
      tooltip: "Executor status unavailable",
      repairConnections,
    };
  }

  const state: StatusState =
    needsAttention > 0 ? "attention" : connections.length === 0 ? "empty" : unverified > 0 ? "unverified" : "reported";
  const tooltip =
    needsAttention > 0
      ? `${needsAttention} connection${needsAttention === 1 ? "" : "s"} need attention`
      : connections.length === 0
        ? "No Executor connections"
        : `${reportedHealthy} reported healthy${unverified ? `, ${unverified} with unknown health` : ""}${stale ? `, ${stale} stale` : ""}`;

  return {
    state,
    total: connections.length,
    reportedHealthy,
    needsAttention,
    unverified,
    stale,
    oldestCheckedAt,
    menuBarTitle: needsAttention > 0 ? String(needsAttention) : undefined,
    tooltip,
    repairConnections,
  };
}
