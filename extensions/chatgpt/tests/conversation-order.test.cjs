const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chatTransformer } = require("../src/utils/index.ts");

test("follow-up history stays in chronological order", () => {
  const chats = [
    { question: "First question", answer: "First answer" },
    { question: "Second question", answer: "Second answer" },
  ];
  const messages = chatTransformer(chats, "Help");
  assert.deepEqual(
    messages.map((message) => message.content),
    ["Help", "First question", "First answer", "Second question", "Second answer"],
  );
});
