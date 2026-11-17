import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAllSnapshots } from "@/adapters";

afterEach(() => {
  vi.unstubAllGlobals();
});

const MISTRAL = {
  id: "site-1",
  url: "https://status.mistral.ai",
  provider: "checkly" as const,
};

function stubFetch(routes: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const body = routes[String(input)];
      return body
        ? new Response(JSON.stringify(body), {
            headers: { "Content-Type": "application/json" },
          })
        : new Response("missing", { status: 404 });
    }),
  );
}

describe("fetchAllSnapshots", () => {
  it("finds the new platform of a saved site that moved", async () => {
    stubFetch({
      "https://status.mistral.ai/api/v1/status.json": {
        page: { name: "Mistral AI Status", url: "https://status.mistral.ai" },
        status: { indicator: "none", description: "All Systems Operational" },
        incidents: [],
      },
    });

    const snapshots = await fetchAllSnapshots([MISTRAL]);

    expect(snapshots[MISTRAL.id]).toMatchObject({
      overallDescription: "All Systems Operational",
      redetectedProvider: "rootly",
    });
    expect(snapshots[MISTRAL.id].error).toBeUndefined();
  });

  it("keeps the error and the saved provider when no platform works", async () => {
    stubFetch({});

    const snapshots = await fetchAllSnapshots([MISTRAL]);

    expect(snapshots[MISTRAL.id].error).toBe("HTTP 404");
    expect(snapshots[MISTRAL.id].redetectedProvider).toBeUndefined();
  });
});
