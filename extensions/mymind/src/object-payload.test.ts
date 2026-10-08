import { strict as assert } from "node:assert";
import test from "node:test";
import { buildObjectMetadata } from "./object-payload";

test("buildObjectMetadata maps tags and spaces to API shape", () => {
  assert.deepEqual(buildObjectMetadata({ title: "Sunset", tags: ["travel", "photo"], spaceId: "space-1" }), {
    title: "Sunset",
    tags: [{ name: "travel" }, { name: "photo" }],
    spaces: [{ id: "space-1" }],
  });
});

test("buildObjectMetadata omits empty values", () => {
  assert.deepEqual(buildObjectMetadata({}), {
    title: undefined,
    tags: undefined,
    spaces: undefined,
  });
});
