import { afterEach, describe, expect, it, vi } from "vitest";

import { incidentIoAdapter } from "@/adapters/incident-io";

afterEach(() => {
  vi.unstubAllGlobals();
});

const IMPACTS = {
  component_impacts: [],
  component_uptimes: [
    {
      component_id: "comp-1",
      data_available_since: "2021-04-22T08:02:00Z",
      uptime: "100.00",
    },
  ],
};

const INCIDENTS = { incidents: [] };

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

describe("incidentIoAdapter", () => {
  it("follows a status page redirect before calling the proxy JSON API", async () => {
    const fetchMock = vi.fn(
      async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const url = String(input);
        if (
          init?.redirect === "manual" &&
          url === "https://status.linear.app"
        ) {
          return new Response(null, {
            status: 301,
            headers: { Location: "https://linearstatus.com/" },
          });
        }

        if (url.includes("status.linear.app/proxy/status.linear.app")) {
          return new Response("<html>redirected</html>", {
            headers: { "Content-Type": "text/html" },
          });
        }

        if (
          url.includes(
            "linearstatus.com/proxy/linearstatus.com/component_impacts",
          )
        ) {
          return jsonResponse(IMPACTS);
        }

        if (url.includes("linearstatus.com/proxy/linearstatus.com/incidents")) {
          return jsonResponse(INCIDENTS);
        }

        if (url === "https://linearstatus.com") {
          return new Response("<html><title>Linear Status</title></html>", {
            headers: { "Content-Type": "text/html" },
          });
        }

        return new Response("missing", { status: 404 });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      incidentIoAdapter.detect?.("https://status.linear.app"),
    ).resolves.toBe(true);

    const snapshot = await incidentIoAdapter.fetchSnapshot({
      url: "https://status.linear.app",
    });

    expect(snapshot.error).toBeUndefined();
    expect(snapshot.pageName).toBe("Linear");
    expect(snapshot.pageUrl).toBe("https://linearstatus.com");
    expect(snapshot.components).toEqual([
      {
        id: "comp-1",
        name: "comp-1",
        status: "operational",
        uptimePercent: 100,
        historyDays: expect.any(Array),
      },
    ]);
  });
});
