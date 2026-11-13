import { afterEach, describe, expect, it, vi } from "vitest";

import { checklyAdapter } from "@/adapters/checkly";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Encodes a value the way Nuxt embeds `__NUXT_DATA__`: a flat array of indices. */
function toNuxtData(root: unknown): string {
  const values: unknown[] = [];
  const add = (value: unknown): number => {
    const index = values.length;
    values.push(null);
    values[index] = Array.isArray(value)
      ? value.map(add)
      : value !== null && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, add(item)]),
          )
        : value;
    return index;
  };
  add(root);
  return JSON.stringify(values);
}

const PAYLOAD = {
  data: {
    "status-page-resolver-checkly": {
      statusPage: { name: "Checkly Status" },
    },
    "unresolved-incidents-checkly": {
      incidents: [
        {
          id: "api-down",
          name: "API is down",
          severity: "MAJOR",
          lastUpdateStatus: "INVESTIGATING",
          updatedAt: "2026-10-20T10:00:00Z",
        },
      ],
    },
    // v3 payload: one flat list of services with their days.
    "uptime-checkly": {
      uptime: [
        {
          id: "api",
          name: "API",
          uptime: 99.5,
          days: [
            {
              date: "2026-10-19T00:00:00Z",
              events: [{ severity: "MEDIUM", lastUpdateStatus: "RESOLVED" }],
            },
            {
              date: "2026-10-20T00:00:00Z",
              events: [
                { severity: "MAJOR", lastUpdateStatus: "INVESTIGATING" },
              ],
            },
          ],
        },
        {
          id: "dashboard",
          name: "Dashboard",
          uptime: 100,
          days: [{ date: "2026-10-20T00:00:00Z", events: [] }],
        },
      ],
    },
  },
};

function stubPage(html: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(html)),
  );
}

const PAGE = `<html><script type="application/json" id="__NUXT_DATA__">${toNuxtData(PAYLOAD)}</script></html>`;

describe("checklyAdapter", () => {
  it("detects pages with a Nuxt status payload", async () => {
    stubPage(PAGE);
    await expect(
      checklyAdapter.detect?.("https://status.checklyhq.com"),
    ).resolves.toBe(true);

    stubPage("<html></html>");
    await expect(
      checklyAdapter.detect?.("https://status.checklyhq.com"),
    ).resolves.toBe(false);
  });

  it("maps services, outages, and incidents from the v3 payload", async () => {
    stubPage(PAGE);

    const snapshot = await checklyAdapter.fetchSnapshot({
      url: "https://status.checklyhq.com",
      includeHistory: true,
    });

    expect(snapshot.pageName).toBe("Checkly Status");
    expect(snapshot.indicator).toBe("critical");
    expect(snapshot.components).toEqual([
      {
        id: "api",
        name: "API",
        status: "major_outage",
        uptimePercent: 99.5,
        historyDays: [
          { date: "2026-10-19", level: "partial" },
          { date: "2026-10-20", level: "major" },
        ],
      },
      {
        id: "dashboard",
        name: "Dashboard",
        status: "operational",
        uptimePercent: 100,
        historyDays: [{ date: "2026-10-20", level: "operational" }],
      },
    ]);
    expect(snapshot.incidents).toEqual([
      {
        id: "api-down",
        name: "API is down",
        status: "investigating",
        impact: "critical",
        updatedAt: "2026-10-20T10:00:00Z",
        body: undefined,
      },
    ]);
  });
});
