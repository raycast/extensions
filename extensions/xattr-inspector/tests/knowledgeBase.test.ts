import test from "node:test";
import assert from "node:assert/strict";
import { getAttributeDescription } from "../src/utils/knowledgeBase";

test("dynamic kMDLabel attributes have an opaque metadata description", () => {
  const description = getAttributeDescription("com.apple.metadata:kMDLabel_ucv4rwcsx2c3lyldb7lmkwvpuy");

  assert.match(description ?? "", /Opaque Spotlight\/Finder label metadata/);
});
