import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { perplexityProvider } from "../src/providers/catalog/perplexity";

const PERPLEXITY = "https://status.perplexity.com/proxy/status.perplexity.com";

test("Perplexity fetches status, uptime and completed maintenance from its official source", async (t) => {
  const requests = intercept(t, {
    [PERPLEXITY]: {
      summary: {
        components: [{ id: "website", name: "Website" }],
        affected_components: [],
        ongoing_incidents: [],
        scheduled_maintenances: [],
        history_window_days: 90,
        display_uptime_mode: "chart_and_percentage",
        structure: { items: [{ component: { component_id: "website", name: "Website", display_uptime: true } }] },
      },
    },
    [`${PERPLEXITY}/incidents`]: {
      incidents: [
        {
          id: "maintenance",
          name: "Scheduled maintenance",
          type: "maintenance",
          status: "maintenance_complete",
          published_at: "2026-09-07T23:11:01.516Z",
          updates: [
            {
              id: "maintenance-complete",
              to_status: "maintenance_complete",
              message_string: "Maintenance complete.",
              published_at: "2026-09-07T23:12:00Z",
            },
          ],
        },
      ],
    },
    [`${PERPLEXITY}/component_impacts`]: {
      component_impacts: [],
      component_uptimes: [{ component_id: "website", uptime: "99.95" }],
    },
  });

  const result = await perplexityProvider.adapter.fetch(new AbortController().signal);
  assert.equal(result.health, "operational");
  assert.equal(result.components[0]?.history?.uptimeText, "99.95%");
  assert.equal(result.components[0]?.history?.days.length, 90);
  assert.equal(result.incidents[0]?.state, "resolved");
  assert.equal(result.incidents[0]?.updates[0]?.state, "resolved");
  assert.equal(result.incidents[0]?.resolvedAt, "2026-09-07T23:12:00Z");
  assert.ok(requests.every((url) => url.startsWith(PERPLEXITY)));
});

function intercept(t: TestContext, payloads: Record<string, unknown>) {
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    const payload = payloads[url.split("?")[0]!];
    return new Response(payload ? JSON.stringify(payload) : "Not found", {
      status: payload ? 200 : 404,
      headers: { "Content-Type": payload ? "application/json" : "text/html" },
    });
  });
  return requests;
}
