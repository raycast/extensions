import { strict as assert } from "node:assert";
import test from "node:test";
import { getRelatedObjectIds, matchesRelatedItemSearch } from "./object-links";
import { Link, MyMindObject } from "./types";

function createObject(overrides: Partial<MyMindObject> = {}): MyMindObject {
  return {
    id: "object-1",
    title: "Voice Agents on Vercel",
    url: "https://vercel.com/blog/voice-agents",
    source: undefined,
    content: undefined,
    blob: undefined,
    screenshot: undefined,
    mainEntity: undefined,
    summary: "A post about voice agents.",
    tags: [{ name: "ai", id: undefined, flags: 1, count: undefined, modified: undefined }],
    spaces: undefined,
    notes: [{ id: "note-1", content: { type: "text/markdown", body: "Mentions OpenAI and Vercel." } }],
    created: "2024-01-01T00:00:00Z",
    modified: "2024-01-01T00:00:00Z",
    bumped: "2024-01-01T00:00:00Z",
    deleted: undefined,
    ...overrides,
  };
}

test("getRelatedObjectIds deduplicates while preserving encounter order", () => {
  const links: Link[] = [
    { id: "1", type: "Manual", sourceId: "anchor", targetId: "b", flags: 0 },
    { id: "2", type: "Manual", sourceId: "c", targetId: "anchor", flags: 0 },
    { id: "3", type: "Manual", sourceId: "anchor", targetId: "b", flags: 0 },
    { id: "4", type: "Manual", sourceId: "anchor", targetId: "d", flags: 0 },
  ];

  assert.deepEqual(getRelatedObjectIds("anchor", links), ["b", "c", "d"]);
});

test("matchesRelatedItemSearch checks object fields and note bodies", () => {
  const object = createObject();

  assert.equal(matchesRelatedItemSearch(object, "voice"), true);
  assert.equal(matchesRelatedItemSearch(object, "openai"), true);
  assert.equal(matchesRelatedItemSearch(object, "not-there"), false);
});
