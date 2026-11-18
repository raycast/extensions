import { strict as assert } from "node:assert";
import test from "node:test";
import { getObjectSubtitle, getObjectUrl } from "./object-info";
import { getObjectKind } from "./object-kind";
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

test("getObjectUrl falls back to mainEntity urls", () => {
  const object = makeObject({
    mainEntity: {
      url: "https://www.notion.so/product",
      "@id": "https://www.notion.so/product",
    },
  });

  assert.equal(getObjectUrl(object), "https://www.notion.so/product");
  assert.equal(getObjectSubtitle(object), "notion.so");
  assert.equal(getObjectKind(object), "link");
});

test("getObjectUrl falls back to mainEntity @id when it is a web url", () => {
  const object = makeObject({
    mainEntity: {
      "@id": "https://guglieri.com/work",
    },
  });

  assert.equal(getObjectUrl(object), "https://guglieri.com/work");
  assert.equal(getObjectKind(object), "link");
});
