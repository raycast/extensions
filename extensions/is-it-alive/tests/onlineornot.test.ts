import { afterEach, describe, expect, it, vi } from "vitest";

import { onlineornotAdapter } from "@/adapters/onlineornot";

afterEach(() => {
  vi.unstubAllGlobals();
});

const OPENROUTER_SUMMARY = {
  success: true,
  result: {
    status: { description: "Minor Service Outage" },
    status_page: {
      id: "bLYZeyaq",
      name: "OpenRouter",
      subdomain: "openrouter",
      custom_domain: "status.openrouter.ai",
    },
    components: [
      {
        id: "chat",
        name: "Chat (/api/v1/chat/completions)",
        status: "PARTIAL_OUTAGE",
      },
      {
        id: "home",
        name: "Homepage",
        status: "OPERATIONAL",
      },
    ],
    active_incidents: [
      {
        id: "inc-1",
        title: "Elevated 429s on Anthropic and OpenAI",
        impact: "PARTIAL_OUTAGE",
        started: "2026-08-28T01:20:00.000Z",
        updated_at: "2026-08-28T01:24:00.000Z",
      },
    ],
    scheduled_maintenance: [],
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("onlineornotAdapter", () => {
  it("detects hosted OnlineOrNot subdomains and skips marketing URLs", async () => {
    await expect(
      onlineornotAdapter.detect?.("https://openrouter.onlineornot.com"),
    ).resolves.toBe(true);
    await expect(
      onlineornotAdapter.detect?.("https://onlineornot.com/status-pages"),
    ).resolves.toBe(false);
    await expect(
      onlineornotAdapter.detect?.("https://www.onlineornot.com"),
    ).resolves.toBe(false);
    await expect(
      onlineornotAdapter.detect?.(
        "https://api.onlineornot.com/v1/status_pages",
      ),
    ).resolves.toBe(false);
  });

  it("looks up custom domains by hostname with the public summary API", async () => {
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.includes("/status_pages/status.openrouter.ai/summary")) {
        return jsonResponse(OPENROUTER_SUMMARY);
      }

      return jsonResponse(
        { success: false, result: null, errors: [{ code: 10001 }] },
        404,
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      onlineornotAdapter.detect?.("https://status.openrouter.ai"),
    ).resolves.toBe(true);
    await expect(
      onlineornotAdapter.detect?.("https://www.githubstatus.com"),
    ).resolves.toBe(false);
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      "https://api.onlineornot.com/v1/status_pages/status.openrouter.ai/summary",
      "https://api.onlineornot.com/v1/status_pages/www.githubstatus.com/summary",
    ]);
  });

  it("maps summary status, components, and active incidents", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(OPENROUTER_SUMMARY));
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await onlineornotAdapter.fetchSnapshot({
      url: "https://openrouter.onlineornot.com",
    });

    expect(snapshot.error).toBeUndefined();
    expect(snapshot.pageName).toBe("OpenRouter");
    expect(snapshot.pageUrl).toBe("https://status.openrouter.ai");
    expect(snapshot.overallDescription).toBe("Minor Service Outage");
    expect(snapshot.indicator).toBe("major");
    expect(snapshot.components).toEqual([
      {
        id: "chat",
        name: "Chat (/api/v1/chat/completions)",
        status: "partial_outage",
      },
      {
        id: "home",
        name: "Homepage",
        status: "operational",
      },
    ]);
    expect(snapshot.incidents).toEqual([
      {
        id: "inc-1",
        name: "Elevated 429s on Anthropic and OpenAI",
        status: "active",
        impact: "major",
        updatedAt: "2026-08-28T01:24:00.000Z",
      },
    ]);
  });

  it("fetches a custom domain through the summary API without reading HTML", async () => {
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.includes("/status_pages/status.openrouter.ai/summary")) {
        return jsonResponse(OPENROUTER_SUMMARY);
      }

      return jsonResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await onlineornotAdapter.fetchSnapshot({
      url: "https://status.openrouter.ai",
    });

    expect(snapshot.error).toBeUndefined();
    expect(snapshot.pageName).toBe("OpenRouter");
    expect(snapshot.indicator).toBe("major");
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      "https://api.onlineornot.com/v1/status_pages/status.openrouter.ai/summary",
    ]);
  });
});
