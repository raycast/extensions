import { afterEach, describe, expect, it, vi } from "vitest";

import { datadogAdapter } from "@/adapters/datadog";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const NOW = new Date("2026-10-20T12:00:00Z");

const CONFIG = {
  name: "OpenRouter",
  pageUrl: "https://openrouter.statuspage.datadoghq.com",
  created: "2026-01-01T00:00:00Z",
  components: [
    {
      id: "api",
      name: "API",
      type: "ComponentGroup",
      components: [
        { id: "chat", name: "Chat", type: "Component", status: "operational" },
      ],
    },
    { id: "web", name: "Web", type: "Component", status: "operational" },
  ],
  incidents: [
    {
      id: "slow-chat",
      title: "Chat is slow",
      currentStatus: "resolved",
      lastModifiedAt: "2026-10-14T14:00:00Z",
      resolved: true,
      timeline: [
        {
          createdAt: "2026-10-14T14:00:00Z",
          componentsAffected: [{ id: "chat", status: "operational" }],
        },
        {
          createdAt: "2026-10-14T12:00:00Z",
          componentsAffected: [{ id: "chat", status: "degraded" }],
        },
      ],
    },
    {
      id: "web-down",
      title: "Web is down",
      currentStatus: "resolved",
      lastModifiedAt: "2026-10-10T12:36:00Z",
      resolved: true,
      timeline: [
        {
          createdAt: "2026-10-10T12:00:00Z",
          componentsAffected: [{ id: "web", status: "major_outage" }],
        },
        {
          createdAt: "2026-10-10T12:36:00Z",
          componentsAffected: [{ id: "web", status: "operational" }],
        },
      ],
    },
  ],
};

function stubConfig(config: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(config))),
  );
}

describe("datadogAdapter", () => {
  it("detects only configs that point to a Datadog page", async () => {
    stubConfig(CONFIG);
    await expect(
      datadogAdapter.detect?.("https://status.openrouter.ai"),
    ).resolves.toBe(true);

    stubConfig({ ...CONFIG, pageUrl: "https://example.com" });
    await expect(
      datadogAdapter.detect?.("https://status.example.com"),
    ).resolves.toBe(false);
  });

  it("shows an active outage in a component group", async () => {
    stubConfig({
      ...CONFIG,
      components: [
        {
          ...CONFIG.components[0],
          components: [
            {
              id: "chat",
              name: "Chat",
              type: "Component",
              status: "major_outage",
            },
          ],
        },
        CONFIG.components[1],
      ],
      incidents: [
        ...CONFIG.incidents,
        {
          id: "chat-down",
          title: "Chat is down",
          currentStatus: "investigating",
          description: "We are looking into it.",
          lastModifiedAt: "2026-10-20T11:00:00Z",
          resolved: false,
          componentsAffected: [{ id: "chat", status: "major_outage" }],
        },
      ],
    });

    const snapshot = await datadogAdapter.fetchSnapshot({
      url: "https://status.openrouter.ai",
      includeHistory: false,
    });

    expect(snapshot.indicator).toBe("critical");
    expect(snapshot.overallDescription).toBe("1 active incident");
    expect(snapshot.components).toEqual([
      { id: "chat", name: "Chat", status: "major_outage" },
      { id: "web", name: "Web", status: "operational" },
    ]);
    // Resolved incidents stay out of the list.
    expect(snapshot.incidents).toEqual([
      {
        id: "chat-down",
        name: "Chat is down",
        status: "investigating",
        impact: "critical",
        updatedAt: "2026-10-20T11:00:00Z",
        body: "We are looking into it.",
        affectedComponentIds: ["chat"],
      },
    ]);
  });

  it("builds 90-day bars and uptime from incident timelines", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(CONFIG))),
    );

    const snapshot = await datadogAdapter.fetchSnapshot({
      url: "https://status.openrouter.ai",
      includeHistory: true,
    });

    const [chat, web] = snapshot.components;
    expect(chat.historyDays).toHaveLength(90);
    expect(
      chat.historyDays?.filter((day) => day.level !== "operational"),
    ).toEqual([{ date: "2026-10-14", level: "degraded" }]);
    // A degraded component still counts as up.
    expect(chat.uptimePercent).toBe(100);

    expect(
      web.historyDays?.find((day) => day.date === "2026-10-10")?.level,
    ).toBe("major");
    // 36 minutes down in 90 days.
    expect(web.uptimePercent).toBeCloseTo(100 * (1 - 36 / (90 * 24 * 60)), 6);
  });
});
