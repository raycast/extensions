import assert from "node:assert/strict";
import test from "node:test";
import type { Incident } from "../src/domain/types";
import { buildIncidentMarkdown, buildIncidentMetadata } from "../src/utils/incident-markdown";

test("keeps available incident fields in metadata without duplicating them in the timeline", () => {
  const incident: Incident = {
    id: "embedding-api-degraded",
    title: "Embedding API Degraded",
    health: "degraded",
    state: "investigating",
    impactText: "Degraded performance",
    startedAt: "2026-08-12T14:16:00Z",
    updatedAt: "2026-08-12T14:30:00Z",
    affectedComponentIds: [],
    updates: [],
  };

  const metadata = buildIncidentMetadata(incident);

  assert.deepEqual(
    metadata.map(({ title }) => title),
    ["State", "Impact", "Started", "Last Updated"],
  );
  assert.equal(metadata[0]?.text, "Investigating");
  assert.equal(metadata[1]?.text, "Degraded performance");
  assert.ok(metadata[2]?.text);
  assert.ok(metadata[3]?.text);
  assert.doesNotMatch(buildIncidentMarkdown(incident), /State:|Impact:|Started:|Last updated:/);
});
