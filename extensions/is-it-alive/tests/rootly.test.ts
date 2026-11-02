import { afterEach, describe, expect, it, vi } from "vitest";

import { rootlyAdapter } from "@/adapters/rootly";

afterEach(() => {
  vi.unstubAllGlobals();
});

const MISTRAL_OUTAGE = {
  page: { name: "Mistral AI Status", url: "https://status.mistral.ai" },
  status: { indicator: "major", description: "Major Service Outage" },
  incidents: [
    {
      name: "Chat API errors",
      status: "investigating",
      impact: "major",
      started_at: "2026-10-20T10:00:00Z",
      resolved_at: null,
      url: "https://status.mistral.ai/incidents/chat-api-errors",
      incident_updates: [
        {
          body: "A fix is in progress.",
          status: "identified",
          created_at: "2026-10-20T10:30:00Z",
        },
        {
          body: "We see errors.",
          status: "investigating",
          created_at: "2026-10-20T10:00:00Z",
        },
      ],
    },
  ],
};

function stubStatus(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Parameters<typeof fetch>[0]) =>
      String(input) === "https://status.mistral.ai/api/v1/status.json"
        ? new Response(JSON.stringify(body), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("missing", { status: 404 }),
    ),
  );
}

describe("rootlyAdapter", () => {
  it("detects only the Rootly status API shape", async () => {
    stubStatus(MISTRAL_OUTAGE);
    await expect(
      rootlyAdapter.detect?.("https://status.mistral.ai"),
    ).resolves.toBe(true);

    stubStatus({ page: { name: "Other" }, components: [] });
    await expect(
      rootlyAdapter.detect?.("https://status.mistral.ai"),
    ).resolves.toBe(false);
  });

  it("shows an outage with the latest incident update", async () => {
    stubStatus(MISTRAL_OUTAGE);

    const snapshot = await rootlyAdapter.fetchSnapshot({
      url: "https://status.mistral.ai",
      includeHistory: true,
    });

    expect(snapshot.indicator).toBe("major");
    expect(snapshot.overallDescription).toBe("Major Service Outage");
    expect(snapshot.incidents).toEqual([
      {
        id: "https://status.mistral.ai/incidents/chat-api-errors",
        name: "Chat API errors",
        status: "identified",
        impact: "major",
        updatedAt: "2026-10-20T10:30:00Z",
        body: "A fix is in progress.",
      },
    ]);
  });

  it("shows maintenance as a minor issue", async () => {
    stubStatus({
      ...MISTRAL_OUTAGE,
      status: { indicator: "maintenance", description: "Maintenance" },
      incidents: [],
    });

    const snapshot = await rootlyAdapter.fetchSnapshot({
      url: "https://status.mistral.ai",
      includeHistory: false,
    });

    expect(snapshot.indicator).toBe("minor");
  });
});
