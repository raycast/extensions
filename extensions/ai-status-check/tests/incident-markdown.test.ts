import assert from "node:assert/strict";
import test from "node:test";
import type { Incident } from "../src/domain/types";
import { buildIncidentMarkdown } from "../src/utils/incident-markdown";

test("renders incident metadata as separate list items", () => {
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

  const metadata = buildIncidentMarkdown(incident)
    .split("\n")
    .filter((line) => line.startsWith("- "));

  assert.equal(metadata.length, 4);
  assert.equal(metadata[0], "- **State:** Investigating");
  assert.equal(metadata[1], "- **Impact:** Degraded performance");
  assert.match(metadata[2] ?? "", /^- \*\*Started:\*\* /);
  assert.match(metadata[3] ?? "", /^- \*\*Last updated:\*\* /);
});
