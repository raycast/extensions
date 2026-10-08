import assert from "node:assert/strict";
import test from "node:test";
import { parseMultipleCards } from "./parser";

test("parses vocabulary bullet items as separate flashcards", () => {
  const cards = parseMultipleCards(
    [
      "# Beginner Spanish Vocabulary",
      "## Greetings",
      "- **Hello** — Hola",
      "- **Good morning** — Buenos días",
      "#spanish #beginner #vocabulary",
    ].join("\n"),
  );

  assert.equal(cards.length, 2);
  assert.deepEqual(cards[0], {
    type: "standard",
    front: "Hello",
    back: "Hola",
    tags: ["spanish", "beginner", "vocabulary"],
  });
});

test("does not save unstructured prose as a flashcard", () => {
  assert.deepEqual(parseMultipleCards("# Vocabulary\nHello — Hola"), []);
});
