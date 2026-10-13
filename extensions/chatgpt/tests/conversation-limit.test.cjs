const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chatTransformer } = require("../src/utils/index.ts");

// Each short question and answer counts as 100 tokens, so one chat costs 200 and 18 fit in the 3,750 budget.
const chats = Array.from({ length: 25 }, (_, i) => ({
  id: `chat-${i}`,
  question: `question ${i}`,
  answer: `answer ${i}`,
  created_at: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
}));

test("long conversations keep the most recent turns", () => {
  const messages = chatTransformer(chats, "");
  const questions = messages.filter((message) => message.role === "user").map((message) => message.content);
  assert.equal(questions.length, 18);
  assert.equal(questions.at(-1), "question 24");
  assert.equal(questions[0], "question 7");
  assert.ok(!questions.includes("question 0"));
});

test("kept turns stay in chronological order after the system prompt", () => {
  const messages = chatTransformer(chats, "Be brief");
  assert.deepEqual(messages[0], { role: "system", content: "Be brief" });
  assert.deepEqual(messages.slice(1, 3), [
    { role: "user", content: "question 7" },
    { role: "assistant", content: "answer 7" },
  ]);
  assert.deepEqual(messages.at(-1), { role: "assistant", content: "answer 24" });
});

test("an oversized newest turn is still sent", () => {
  const longAnswer = Array.from({ length: 2800 }, (_, i) => `word${i}`).join(" ");
  const messages = chatTransformer(
    [
      { id: "short", question: "short question", answer: "short answer", created_at: "2026-10-01T00:00:00.000Z" },
      { id: "long", question: "explain in detail", answer: longAnswer, created_at: "2026-10-01T00:01:00.000Z" },
    ],
    "",
  );
  assert.deepEqual(
    messages.map((message) => message.content),
    ["explain in detail", longAnswer],
  );
});

test("short conversations are sent whole", () => {
  const messages = chatTransformer(chats.slice(0, 3), "");
  assert.deepEqual(
    messages.map((message) => message.content),
    ["question 0", "answer 0", "question 1", "answer 1", "question 2", "answer 2"],
  );
});
