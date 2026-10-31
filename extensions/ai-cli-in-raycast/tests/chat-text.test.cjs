require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  conversationMarkdown,
  conversationGroups,
} = require("../src/chat-text.ts");

test("conversation groups retain all history and within-exchange steering order without mutation", () => {
  const messages = [
    { id: "1", role: "user", content: "first" },
    { id: "2", role: "assistant", content: "first answer" },
    { id: "3", role: "user", content: "second" },
    { id: "4", role: "user", kind: "steer", content: "extra" },
    { id: "5", role: "assistant", content: "second answer" },
  ];
  assert.deepEqual(
    conversationGroups(messages).map((group) =>
      group.map((message) => message.id),
    ),
    [
      ["3", "4", "5"],
      ["1", "2"],
    ],
  );
  assert.deepEqual(
    messages.map((message) => message.id),
    ["1", "2", "3", "4", "5"],
  );
});

test("latest exchange comes first while every question stays before its answer", () => {
  const messages = [
    { id: "1", role: "user", content: "First question" },
    { id: "2", role: "assistant", content: "First answer" },
    { id: "3", role: "user", content: "Next question" },
    { id: "4", role: "assistant", content: "Next answer" },
  ];
  const before = JSON.stringify(messages);
  const output = conversationMarkdown(messages, "/my assets", "", "");
  assert.ok(output.indexOf("Next question") < output.indexOf("Next answer"));
  assert.ok(output.indexOf("Next answer") < output.indexOf("First question"));
  assert.ok(output.indexOf("First question") < output.indexOf("First answer"));
  assert.equal(output.split("\n\n---\n\n").length, 2);
  assert.match(
    output,
    /<sub>!\[You\]\(<file:\/\/.*user-avatar\.svg\?raycast-width=18&raycast-height=18>\)<\/sub> \*\*You\*\*/,
  );
  assert.doesNotMatch(output, /!\[Codex\]/);
  assert.equal(JSON.stringify(messages), before);
});

test("an explicit provider logo uses a local URL without altering message content", () => {
  const output = conversationMarkdown(
    [{ id: "a", role: "assistant", content: "**Original answer**" }],
    path.resolve("/provider icons"),
    "",
    "",
    "Gemini",
    "gemini.svg",
  );
  assert.match(output, /!\[Gemini\]\(<file:\/\//);
  assert.match(output, /provider%20icons\/gemini\.svg\?raycast-width=18/);
  assert.match(output, /\*\*Original answer\*\*/);
});

test("steering and multiple assistant items retain their order within one exchange", () => {
  const messages = [
    { id: "1", role: "user", content: "Question" },
    { id: "2", role: "assistant", content: "First part" },
    { id: "3", role: "assistant", content: "Second part" },
    { id: "4", role: "user", kind: "steer", content: "Use TypeScript" },
    { id: "5", role: "assistant", content: "Final part" },
  ];
  const output = conversationMarkdown(messages, "/assets", "", "");
  const sequence = [
    "Question",
    "First part",
    "Second part",
    "Use TypeScript",
    "Final part",
  ];
  sequence
    .slice(1)
    .forEach((value, i) =>
      assert.ok(output.indexOf(sequence[i]) < output.indexOf(value)),
    );
  assert.ok(!output.includes("\n\n---\n\n"));
  assert.equal(output.match(/\*\*Codex\*\*/g).length, 2);
});

test("multiline user code remains a complete quoted Markdown block", () => {
  const output = conversationMarkdown(
    [
      {
        id: "1",
        role: "user",
        content: "Fix this:\n\n```js\nconst value = 1;\n```",
      },
    ],
    "/assets",
    "",
    "",
  );
  assert.match(output, /> Fix this:\n> \n> ```js\n> const value = 1;\n> ```/);
});

test("conversation renders code blocks with their original language and indentation", () => {
  const output = conversationMarkdown(
    [
      {
        id: "1",
        role: "assistant",
        content: "### Example\n```python\ndef run():\n    return 2 ** 3\n```",
      },
    ],
    "/assets",
    "",
    "",
  );
  assert.match(
    output,
    /### Example\n```python\ndef run\(\):\n    return 2 \*\* 3\n```/,
  );
});

test("streaming reply retains a thinking placeholder", () => {
  const output = conversationMarkdown(
    [{ id: "1", role: "assistant", content: "", status: "streaming" }],
    "/assets",
    "",
    "",
  );
  assert.match(output, /Codex/);
  assert.match(output, /Thinking…/);
});

test("empty conversation explains the floating input action", () => {
  const output = conversationMarkdown([], "/assets", "", "");
  assert.match(output, /What would you like to work on/);
  assert.match(output, /Press Enter to write a message/);
  assert.doesNotMatch(output, /Type your message above/);
});

test("connection errors take precedence over stale status", () => {
  const output = conversationMarkdown(
    [],
    "/assets",
    "已连接",
    "连接失败\n请重试",
  );
  assert.match(output, /^\*\*Connection Notice\*\* · 连接失败 请重试/);
  assert.ok(!output.includes("已连接"));
});

test("simple exchange separators stay distinct from assistant-generated rules", () => {
  const messages = [
    { id: "u1", role: "user", content: "First question" },
    {
      id: "a1",
      role: "assistant",
      content: "First answer\n\n---\n\nMore detail",
    },
    { id: "u2", role: "user", content: "Second question" },
    {
      id: "a2",
      role: "assistant",
      content: "Second answer\n\n***\n\nFinal detail",
    },
  ];
  const raw = JSON.stringify(messages);
  const output = conversationMarkdown(messages, "/assets", "", "", "Codex");
  assert.match(
    output,
    /^<sub>!\[You\].*<\/sub> \*\*You\*\*\n\n> Second question/,
  );
  assert.match(output, /\*\*Codex\*\*/);
  assert.equal(output.match(/^---$/gm).length, 1);
  assert.doesNotMatch(output, /^\*\*\*$/m);
  assert.ok(output.indexOf("Second answer") < output.indexOf("First question"));
  assert.doesNotMatch(output, /### Exchange/);
  assert.ok(output.includes("More detail"));
  assert.ok(output.includes("Final detail"));
  assert.equal(JSON.stringify(messages), raw);
});
