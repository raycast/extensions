import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchStatus } from "@/adapters";
import { statuspageAdapter } from "@/adapters/statuspage";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ORIGIN = "https://status.example.com";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function summary(componentIds: string[]) {
  return {
    page: { name: "Example", url: ORIGIN },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "group-1", name: "Group", status: "operational", group: true },
      ...componentIds.map((id) => ({ id, name: id, status: "operational" })),
    ],
    incidents: [],
  };
}

function stubStatuspage(
  componentIds: string[],
  showcase: (ids: string[]) => Response,
) {
  const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    switch (url.pathname) {
      case "/api/v2/summary.json":
        return jsonResponse(summary(componentIds));
      case "/api/v2/incidents.json":
        return jsonResponse({ incidents: [] });
      case "/uptime_showcase":
        return showcase(url.searchParams.get("components")?.split(",") ?? []);
      default:
        return new Response("missing", { status: 404 });
    }
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("statuspageAdapter", () => {
  it("reports the page's own 90-day uptime from the lazy uptime showcase", async () => {
    stubStatuspage(["api"], () =>
      jsonResponse({
        timelines: {
          api: {
            component: { code: "api", name: "api" },
            days: [
              { date: "2026-07-01", outages: { m: 120 } },
              { date: "2026-07-02", outages: { p: 600 } },
              { date: "2026-07-03", outages: { d: 300 } },
              { date: "2026-07-04", outages: {} },
            ],
          },
        },
        values: [{ component: "api", ninety: 99.54, sixty: 99.7, thirty: 1 }],
      }),
    );

    const snapshot = await statuspageAdapter.fetchSnapshot({
      url: ORIGIN,
      includeHistory: true,
    });

    expect(snapshot.components).toEqual([
      {
        id: "api",
        name: "api",
        status: "operational",
        uptimePercent: 99.54,
        historyDays: [
          { date: "2026-07-01", level: "major" },
          { date: "2026-07-02", level: "partial" },
          { date: "2026-07-03", level: "degraded" },
          { date: "2026-07-04", level: "operational" },
        ],
      },
    ]);
    expect(snapshot.uptimePercent).toBe(99.54);
  });

  it("requests the showcase in batches the server accepts", async () => {
    const ids = Array.from({ length: 61 }, (_, i) => `c${i}`);
    const requested: string[][] = [];
    stubStatuspage(ids, (batch) => {
      requested.push(batch);
      return jsonResponse({ timelines: {}, values: [] });
    });

    await statuspageAdapter.fetchSnapshot({
      url: ORIGIN,
      includeHistory: true,
    });

    expect(requested.map((batch) => batch.length)).toEqual([60, 1]);
  });

  it("falls back to incident history when the page has no uptime showcase", async () => {
    stubStatuspage(["api"], () => new Response("missing", { status: 404 }));

    const snapshot = await statuspageAdapter.fetchSnapshot({
      url: ORIGIN,
      includeHistory: true,
    });

    expect(snapshot.components[0].uptimePercent).toBeUndefined();
    expect(snapshot.components[0].historyDays).toHaveLength(90);
  });

  it("reads only the summary for the list status", async () => {
    const fetchMock = stubStatuspage(["api"], () =>
      jsonResponse({ timelines: {}, values: [] }),
    );

    const snapshot = await fetchStatus({ url: ORIGIN, provider: "statuspage" });

    expect(snapshot.overallDescription).toBe("All Systems Operational");
    expect(
      fetchMock.mock.calls.map((call) => new URL(String(call[0])).pathname),
    ).toEqual(["/api/v2/summary.json"]);
  });
});
