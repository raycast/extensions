import assert from "node:assert/strict";
import test from "node:test";
import { parseOpenRouterStatusPage } from "../src/providers/adapters/openrouter";

test("adds OpenRouter history only to rows that publish a chart", () => {
  const chart = ["green", "zinc", "red"].map((color) => `<div class="h-8 sm:h-9 w-1 bg-${color}-500"></div>`).join("");
  const html = `<p class="text-gray-900">Chat API</p><span>Operational</span>${chart}<span class="underline">99.9<!-- -->% uptime</span><p class="text-gray-900">Clerk</p><span>Operational</span>`;
  const components = parseOpenRouterStatusPage(html, new Date("2026-08-11T16:00:00Z")).components;

  assert.deepEqual(components[0]?.history?.days, [
    { date: "2026-08-09", level: "operational" },
    { date: "2026-08-10", level: "unknown" },
    { date: "2026-08-11", level: "major_outage" },
  ]);
  assert.equal(components[0]?.history?.uptimePercent, 99.9);
  assert.equal(components[0]?.history?.uptimeText, "99.9%");
  assert.equal(components[1]?.history, undefined);
});
