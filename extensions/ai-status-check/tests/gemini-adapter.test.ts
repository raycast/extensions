import assert from "node:assert/strict";
import test from "node:test";
import type { Incident } from "../src/domain/types";
import { geminiComponents, parseGeminiBootConfig, parseGeminiIncidents } from "../src/providers/adapters/gemini";
import { jsonFixture, textFixture } from "./support/fixtures";

test("maps only verified Gemini status RPC enums and preserves their rendered labels", async () => {
  const page = await textFixture("gemini/page.html");
  const incidents = parseGeminiIncidents(
    await jsonFixture("gemini/incidents.json"),
    "https://aistudio.google.com/status",
  );

  assert.deepEqual(parseGeminiBootConfig(page), {
    apiKey: "public-status-key",
    rpcBase: "https://status-rpc.example.com",
  });

  const major = incidents.find((incident) => incident.id === "major-update");
  assert.equal(major?.state, "monitoring");
  assert.equal(major?.stateText, "Update");
  assert.equal(major?.health, "major_outage");
  assert.deepEqual(major?.affectedComponentIds, ["1"]);
  assert.deepEqual(
    major?.updates.map(({ state, stateText }) => ({ state, stateText })),
    [
      { state: "investigating", stateText: "Detected" },
      { state: "monitoring", stateText: "Update" },
    ],
  );

  const moderate = incidents.find((incident) => incident.id === "moderate-lifecycle");
  assert.equal(moderate?.state, "resolved");
  assert.equal(moderate?.stateText, "Resolved");
  assert.equal(moderate?.health, "degraded");
  assert.deepEqual(
    moderate?.updates.map(({ state, stateText }) => ({ state, stateText })),
    [
      { state: "investigating", stateText: "Detected" },
      { state: "identified", stateText: "Identified" },
      { state: "monitoring", stateText: "Mitigated" },
      { state: "resolved", stateText: "Resolved" },
    ],
  );

  const future = incidents.find((incident) => incident.id === "future-enums");
  assert.equal(future?.state, "unknown");
  assert.equal(future?.stateText, undefined);
  assert.equal(future?.health, "unknown");
  assert.equal(future?.updates[0]?.stateText, undefined);
  const components = geminiComponents(incidents, new Date("2026-08-11T16:00:00Z"));
  assert.equal(components[0]?.history?.uptimePercent, undefined);
  assert.equal(components[0]?.history?.days.at(-1)?.level, "major_outage");
  assert.equal(components[2]?.history?.days.at(-2)?.level, "degraded");
  assert.throws(() => parseGeminiBootConfig("<html></html>"), /boot configuration was missing/);
  assert.throws(() => parseGeminiIncidents({}, "https://example.com"), /response was malformed/);
});
test("extends an active Gemini incident through the current day", () => {
  const incident: Incident = {
    id: "active-api-incident",
    title: "API disruption",
    health: "degraded",
    state: "monitoring",
    startedAt: "2026-08-09T10:00:00Z",
    updatedAt: "2026-08-09T12:00:00Z",
    affectedComponentIds: ["1"],
    updates: [],
  };

  const component = geminiComponents([incident], new Date("2026-08-11T16:00:00Z"))[0];
  assert.deepEqual(component?.history?.days.slice(-3), [
    { date: "2026-08-09", level: "degraded" },
    { date: "2026-08-10", level: "degraded" },
    { date: "2026-08-11", level: "degraded" },
  ]);
});
