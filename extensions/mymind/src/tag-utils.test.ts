import { strict as assert } from "node:assert";
import test from "node:test";
import { Tag } from "./types";
import { isAiTag, isUserTag } from "./tag-utils";

test("isUserTag uses bitwise matching for manual tags", () => {
  const manualTag = { name: "manual", flags: 8 } as Tag;
  const combinedTag = { name: "combined", flags: 10 } as Tag;
  const aiTag = { name: "ai", flags: 2 } as Tag;

  assert.equal(isUserTag(manualTag), true);
  assert.equal(isUserTag(combinedTag), true);
  assert.equal(isUserTag(aiTag), false);
  assert.equal(isAiTag(combinedTag), true);
});
