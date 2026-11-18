import assert from "node:assert/strict";
import test from "node:test";

import { getDocumentCreatorTooltip, getDocumentKeywords } from "../src/helpers/documentCreator.ts";

const creator = { displayName: "Jane", email: "jane@example.com" };

test("keywords include the creator's display name", () => {
  const keywords = getDocumentKeywords({
    title: "Roadmap",
    project: { name: "Acme" },
    initiative: null,
    creator,
  });

  assert.deepEqual(keywords, ["Acme", "", "Roadmap", "Jane"]);
});

test("documents without a creator still produce string-only keywords", () => {
  const keywords = getDocumentKeywords({ title: "Roadmap", creator: null });

  assert.deepEqual(keywords, ["", "", "Roadmap", ""]);
});

test("creator tooltip shows name and email", () => {
  assert.equal(getDocumentCreatorTooltip(creator), "Creator: Jane (jane@example.com)");
});

test("creator tooltip is omitted without a creator", () => {
  assert.equal(getDocumentCreatorTooltip(null), undefined);
});
