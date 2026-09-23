import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPrimaryOrdering,
  comparePromptFallback,
  normalizeSearchText,
  promptFrecencyKey,
  searchPrompts,
} from "../src/lib/search.js";
import { localOnlyMarkdownPreview } from "../src/lib/local-markdown.js";
import type { PromptRecord } from "../src/types/snapshot.js";

const prompts: PromptRecord[] = [
  makePrompt({
    id: "10000000-0000-4000-8000-000000000000",
    title: "Résumé helper",
    content: "Rewrite a professional profile",
    category: { name: "Writing" },
    tags: ["Career"],
    updatedAt: "2026-07-20T00:00:00Z",
  }),
  makePrompt({
    id: "20000000-0000-4000-8000-000000000000",
    title: "Code review",
    content: "Inspect this Swift implementation",
    category: { name: "Development" },
    tags: ["Quality"],
    isFavorite: true,
    lastUsedAt: "2026-07-25T00:00:00Z",
  }),
  makePrompt({
    id: "30000000-0000-4000-8000-000000000000",
    title: "Meeting notes",
    content: "Extract actions from a résumé",
    tags: ["Résumé"],
    updatedAt: "2026-07-22T00:00:00Z",
  }),
];

test("normalizes case and diacritics", () => {
  assert.equal(normalizeSearchText("RÉSUMÉ"), "resume");
});

test("folds Turkish dotted capital I to a plain ASCII i", () => {
  assert.equal(normalizeSearchText("İSTANBUL Insight"), "istanbul insight");
});

test("searches title, content, and category without exposing tags", () => {
  assert.deepEqual(
    searchPrompts(prompts, "resume").map((prompt) => prompt.id),
    [prompts[0]?.id, prompts[2]?.id],
  );
  assert.deepEqual(
    searchPrompts(prompts, "swift").map((prompt) => prompt.id),
    [prompts[1]?.id],
  );
  assert.deepEqual(
    searchPrompts(prompts, "development").map((prompt) => prompt.id),
    [prompts[1]?.id],
  );
  assert.deepEqual(searchPrompts(prompts, "career"), []);
});

test("puts title relevance before metadata and content relevance", () => {
  assert.deepEqual(
    searchPrompts(prompts, "resume").map((prompt) => prompt.title),
    ["Résumé helper", "Meeting notes"],
  );
});

test("orders favorites first by default while preserving frecency order inside groups", () => {
  const frecencyOrder = [prompts[0]!, prompts[2]!, prompts[1]!];
  assert.deepEqual(
    applyPrimaryOrdering(frecencyOrder, "").map((prompt) => prompt.id),
    [prompts[1]?.id, prompts[0]?.id, prompts[2]?.id],
  );
});

test("uses Promptty dates and title as deterministic unvisited fallbacks", () => {
  const sorted = [...prompts].sort(comparePromptFallback);
  assert.deepEqual(
    sorted.map((prompt) => prompt.id),
    [prompts[1]?.id, prompts[2]?.id, prompts[0]?.id],
  );
});

test("keys local frecency only by the stable Promptty UUID", () => {
  const prompt = prompts[0]!;
  assert.equal(promptFrecencyKey(prompt), prompt.id);
  assert.equal(promptFrecencyKey({ ...prompt, title: "Renamed" }), prompt.id);
});

test("prevents remote image embeds from loading in the local detail preview", () => {
  assert.equal(
    localOnlyMarkdownPreview("Text ![private](https://example.com/pixel?secret=1)"),
    String.raw`Text \![private](https://example.com/pixel?secret=1)`,
  );
  assert.equal(
    localOnlyMarkdownPreview('<img src="https://example.com/pixel?secret=1">'),
    '&lt;img src="https://example.com/pixel?secret=1">',
  );
});

function makePrompt(overrides: Partial<PromptRecord> & Pick<PromptRecord, "id" | "title" | "content">): PromptRecord {
  return {
    isFavorite: false,
    usageCount: 0,
    tags: [],
    ...overrides,
  };
}
