import { describe, expect, test } from "bun:test";
import {
  buildStatusSnapshot,
  connectionNeedsAttention,
  recordedHealthAge,
  statusConnectionTitles,
  STALE_REPORT_MS,
} from "../src/lib/status";
import type { Connection, HealthStatus } from "../src/lib/types";

function connection(
  status?: HealthStatus,
  options: { checkedAt?: number; missingScopes?: string[]; name?: string } = {},
): Connection {
  return {
    owner: "user",
    name: options.name ?? "default",
    integration: "github",
    template: "oauth",
    provider: "openapi",
    address: `github.user.${options.name ?? "default"}`,
    missingOAuthScopes: options.missingScopes ?? [],
    lastHealth: status
      ? {
          status,
          checkedAt: options.checkedAt ?? Date.now(),
        }
      : null,
  };
}

describe("Executor recorded status", () => {
  test("qualifies duplicate menu labels across workspaces while keeping distinct labels compact", () => {
    const titles = statusConnectionTitles([
      { id: "one", title: "Notion", workspace: "Personal" },
      { id: "two", title: "Notion", workspace: "Work" },
      { id: "three", title: "Slack", workspace: "Work" },
    ]);
    expect([...titles.values()]).toEqual(["Notion (Personal)", "Notion (Work)", "Slack"]);
  });

  test("keeps same-workspace duplicate identities and literal suffixes distinct", () => {
    const rows = [
      { id: "one", title: "Notion", workspace: "Work" },
      { id: "two", title: "Notion", workspace: "Work" },
      { id: "three", title: "Notion (Work)", workspace: "Work" },
      { id: "four", title: "Notion (Work) (2)", workspace: "Work" },
    ];
    const titles = statusConnectionTitles(rows);
    expect(new Set(titles.values()).size).toBe(rows.length);
    expect(titles.size).toBe(rows.length);
  });

  test("counts attention once across unhealthy reports and missing scopes", () => {
    const connections = [
      connection("healthy", { name: "healthy" }),
      connection("degraded", { name: "degraded", missingScopes: ["write"] }),
      connection("healthy", { name: "scope", missingScopes: ["read"] }),
    ];
    const snapshot = buildStatusSnapshot(connections);

    expect(snapshot.state).toBe("attention");
    expect(snapshot.reportedHealthy).toBe(1);
    expect(snapshot.needsAttention).toBe(2);
    expect(snapshot.menuBarTitle).toBe("2");
    expect(snapshot.repairConnections).toHaveLength(2);
    expect(connectionNeedsAttention(connections[1])).toBe(true);
  });

  test.each(["expired", "degraded", "misconfigured"] as const)(
    "treats a saved %s report as needing attention",
    (status) => {
      const snapshot = buildStatusSnapshot([connection(status)]);
      expect(snapshot.needsAttention).toBe(1);
      expect(snapshot.menuBarTitle).toBe("1");
    },
  );

  test("does not count unknown or absent reports as healthy", () => {
    const snapshot = buildStatusSnapshot([connection("unknown"), connection()]);

    expect(snapshot.state).toBe("unverified");
    expect(snapshot.reportedHealthy).toBe(0);
    expect(snapshot.unverified).toBe(2);
    expect(snapshot.menuBarTitle).toBeUndefined();
  });

  test("labels stale data as a recorded report rather than live verification", () => {
    const now = Date.UTC(2026, 8, 11, 12);
    const checkedAt = now - STALE_REPORT_MS - 60_000;
    const snapshot = buildStatusSnapshot([connection("healthy", { checkedAt })], undefined, now);

    expect(snapshot.state).toBe("reported");
    expect(snapshot.reportedHealthy).toBe(1);
    expect(snapshot.stale).toBe(1);
    expect(snapshot.oldestCheckedAt).toBe(checkedAt);
    expect(snapshot.tooltip).toBe("1 reported healthy, 1 stale");
    expect(recordedHealthAge(checkedAt, now)).toBe("Checked 1d ago");
  });

  test("retrieval errors produce an unavailable state instead of a healthy state", () => {
    const snapshot = buildStatusSnapshot([connection("healthy")], new Error("Offline"));

    expect(snapshot.state).toBe("unavailable");
    expect(snapshot.menuBarTitle).toBeUndefined();
    expect(snapshot.tooltip).toBe("Executor status unavailable");
  });
});
