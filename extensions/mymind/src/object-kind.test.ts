import { strict as assert } from "node:assert";
import test from "node:test";
import { getObjectKind, matchesTypeFilter } from "./object-kind";
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

test("web-sourced images still classify as images", () => {
  const object = makeObject({
    url: "https://dribbble.com/shots/123",
    blob: { type: "image/jpeg" } as MyMindObject["blob"],
  });

  assert.equal(getObjectKind(object), "image");
});

test("web-sourced videos still classify as videos", () => {
  const object = makeObject({
    url: "https://youtube.com/watch?v=abc",
    blob: { type: "video/mp4" } as MyMindObject["blob"],
  });

  assert.equal(getObjectKind(object), "video");
});

test("image filter excludes link objects", () => {
  const object = makeObject({
    url: "https://notion.so/page",
  });

  assert.equal(matchesTypeFilter(object, "image"), false);
});

test("image filter keeps image objects", () => {
  const object = makeObject({
    url: "https://dribbble.com/shots/123",
    blob: { type: "image/jpeg" } as MyMindObject["blob"],
  });

  assert.equal(matchesTypeFilter(object, "image"), true);
});

test("article filter keeps link-like objects", () => {
  const object = makeObject({
    url: "https://notion.so/page",
  });

  assert.equal(matchesTypeFilter(object, "article"), true);
});
