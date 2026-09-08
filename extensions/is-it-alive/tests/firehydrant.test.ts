import { afterEach, describe, expect, it, vi } from "vitest";

import { firehydrantAdapter } from "@/adapters/firehydrant";

afterEach(() => {
  vi.unstubAllGlobals();
});

const REDIS_PAYLOAD = {
  config: {
    companyName: "Redis Service Health",
    title: "Redis Service Health",
    operationalMessage: "Currently, there are no active incidents.",
  },
  components: [
    { id: "rest", name: "REST API" },
    { id: "dns", name: "DNS Resolvers" },
  ],
  conditions: {
    Degraded: "DEGRADED",
    Operational: "OPERATIONAL",
    Unavailable: "OFFLINE",
    Maintenance: "DEGRADED",
  },
  incidents: [
    {
      id: "resolved-1",
      title: "Past outage",
      timestamps: {
        started: "2026-07-01T00:00:00Z",
        resolved: "2026-07-01T01:00:00Z",
      },
      severitySlug: "SEV3",
    },
    {
      id: "active-1",
      title: "API latency",
      timestamps: { started: "2026-08-28T12:00:00Z" },
      severitySlug: "SEV2",
      components: [{ id: "rest", name: "REST API", condition: "Degraded" }],
    },
  ],
};

describe("firehydrantAdapter", () => {
  it("detects pages that serve /data/payload.json", async () => {
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url === "https://status.redis.io/data/payload.json") {
        return new Response(JSON.stringify(REDIS_PAYLOAD), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("no", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      firehydrantAdapter.detect?.("https://status.redis.io"),
    ).resolves.toBe(true);
    await expect(
      firehydrantAdapter.detect?.("https://www.githubstatus.com"),
    ).resolves.toBe(false);
  });

  it("maps active incidents and component conditions from payload.json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(REDIS_PAYLOAD), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const snapshot = await firehydrantAdapter.fetchSnapshot({
      url: "https://status.redis.io",
    });

    expect(snapshot.error).toBeUndefined();
    expect(snapshot.pageName).toBe("Redis Service Health");
    expect(snapshot.indicator).toBe("minor");
    expect(snapshot.overallDescription).toBe("1 active incident");
    expect(snapshot.components).toEqual([
      { id: "rest", name: "REST API", status: "degraded_performance" },
      { id: "dns", name: "DNS Resolvers", status: "operational" },
    ]);
    expect(snapshot.incidents).toEqual([
      {
        id: "active-1",
        name: "API latency",
        status: "active",
        impact: "critical",
        updatedAt: "2026-08-28T12:00:00Z",
        affectedComponentIds: ["rest"],
      },
    ]);
  });
});
