import { strict as assert } from "node:assert";
import test from "node:test";
import { getObjectDisplayTitle } from "./display-title";
import { MyMindObject } from "./types";

function makeObject(overrides: Partial<MyMindObject>): MyMindObject {
  return {
    id: "object-1",
    tags: [],
    created: "2024-01-01T00:00:00Z",
    modified: "2024-01-01T00:00:00Z",
    bumped: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

test("getObjectDisplayTitle prefers explicit titles", () => {
  assert.equal(getObjectDisplayTitle(makeObject({ title: "Sunset in Rome" })), "Sunset in Rome");
});

test("getObjectDisplayTitle falls back by object type", () => {
  assert.equal(
    getObjectDisplayTitle(makeObject({ blob: { type: "image/jpeg" } as MyMindObject["blob"] })),
    "Untitled Image",
  );
  assert.equal(
    getObjectDisplayTitle(makeObject({ blob: { type: "video/mp4" } as MyMindObject["blob"] })),
    "Untitled Video",
  );
  assert.equal(
    getObjectDisplayTitle(makeObject({ blob: { type: "application/pdf" } as MyMindObject["blob"] })),
    "Untitled PDF",
  );
  assert.equal(
    getObjectDisplayTitle(makeObject({ content: { type: "text/markdown", body: "hello" } })),
    "Untitled Note",
  );
  assert.equal(getObjectDisplayTitle(makeObject({ url: "https://example.com" })), "Untitled Link");
});
